import { createHash, randomBytes } from "crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { closeDb, db, teardown } from "./_helpers";

// MCP server at /api/mcp. Protocol tests need only the app; the authoring flow
// needs the database (POSTGRES_URL) and the dev server's service-role key.

let rpcId = 0;
async function rpc(request: APIRequestContext, method: string, params?: unknown, key?: string) {
  const res = await request.post("/api/mcp", {
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    data: { jsonrpc: "2.0", id: ++rpcId, method, ...(params !== undefined ? { params } : {}) },
  });
  expect(res.status()).toBe(200);
  return res.json();
}

async function call(request: APIRequestContext, key: string, name: string, args: Record<string, unknown>) {
  const body = await rpc(request, "tools/call", { name, arguments: args }, key);
  const text = body.result.content[0].text as string;
  return { isError: Boolean(body.result.isError), text, data: body.result.isError ? null : JSON.parse(text) };
}

test.describe("protocol", () => {
  test("initialize negotiates the version and lists tools", async ({ request }) => {
    const init = await rpc(request, "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(init.result.protocolVersion).toBe("2025-03-26");
    expect(init.result.serverInfo.name).toBe("klikr");
    expect(init.result.instructions).toMatch(/klikr_create_presentation/);

    const unknownVersion = await rpc(request, "initialize", { protocolVersion: "1999-01-01" });
    expect(unknownVersion.result.protocolVersion).toBe("2025-06-18");

    const list = await rpc(request, "tools/list");
    const names = list.result.tools.map((t: { name: string }) => t.name);
    for (const n of [
      "klikr_create_presentation",
      "klikr_get_presentation",
      "klikr_add_slides",
      "klikr_update_slide",
      "klikr_delete_slide",
      "klikr_reorder_slides",
      "klikr_duplicate_presentation",
    ]) {
      expect(names).toContain(n);
    }
  });

  test("notifications get 202, GET event-stream gets 405, unknown tools are protocol errors", async ({ request }) => {
    const note = await request.post("/api/mcp", {
      headers: { "content-type": "application/json" },
      data: { jsonrpc: "2.0", method: "notifications/initialized" },
    });
    expect(note.status()).toBe(202);

    const sse = await request.get("/api/mcp", { headers: { accept: "text/event-stream" } });
    expect(sse.status()).toBe(405);

    const unknown = await rpc(request, "tools/call", { name: "nope", arguments: {} });
    expect(unknown.error.code).toBe(-32602);

    const batch = await request.post("/api/mcp", {
      headers: { "content-type": "application/json" },
      data: [
        { jsonrpc: "2.0", id: "a", method: "ping" },
        { jsonrpc: "2.0", method: "notifications/initialized" },
      ],
    });
    expect(await batch.json()).toEqual([{ jsonrpc: "2.0", id: "a", result: {} }]);
  });

  test("tool calls without a key return a readable tool error", async ({ request }) => {
    const body = await rpc(request, "tools/call", { name: "klikr_list_presentations", arguments: {} });
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toMatch(/klikr_pk_/);
  });
});

test.describe("authoring flow", () => {
  test.skip(!process.env.POSTGRES_URL, "needs the database (POSTGRES_URL)");
  test.describe.configure({ mode: "serial" });

  const email = `qa+mcp-${randomBytes(4).toString("hex")}@klikr.test`;
  let key = "";
  let otherKey = "";
  let otherEmail = "";
  const created: string[] = [];

  test.beforeAll(async () => {
    const c = await db();
    const mkUser = async (e: string) => {
      const { rows } = await c.query(
        `insert into auth.users (id, email, instance_id, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
         values (gen_random_uuid(), $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb)
         returning id`,
        [e],
      );
      const plaintext = `klikr_pk_${randomBytes(32).toString("base64url")}`;
      await c.query(`insert into api_keys (user_id, label, key_hash, prefix) values ($1, 'e2e', $2, $3)`, [
        rows[0].id,
        createHash("sha256").update(plaintext).digest("hex"),
        plaintext.slice(0, 13),
      ]);
      return plaintext;
    };
    key = await mkUser(email);
    otherEmail = `qa+mcp-other-${randomBytes(4).toString("hex")}@klikr.test`;
    otherKey = await mkUser(otherEmail);
  });

  test.afterAll(async () => {
    for (const id of created) await teardown(id, email);
    await teardown("00000000-0000-0000-0000-000000000000", otherEmail);
    await closeDb();
  });

  test("build, read, edit, reorder, duplicate and delete a quiz deck", async ({ request }) => {
    // One call builds the whole deck.
    const made = await call(request, key, "klikr_create_presentation", {
      title: "MCP e2e quiz",
      slides: [
        { type: "quiz", question: "2 + 2?", options: ["3", "4", "5"], correct_answer: "4", explanation: "Basic maths." },
        { type: "mcq", question: "Favourite colour?", options: ["Red", "Blue"] },
        { type: "rating", question: "How fun was this?", scale: 5 },
      ],
    });
    expect(made.isError).toBe(false);
    created.push(made.data.id);
    expect(made.data.code).toMatch(/^[A-Z0-9]{4,8}$/);
    expect(made.data.join_url).toContain(`/play/${made.data.code}`);
    expect(made.data.slides.map((s: { number: number }) => s.number)).toEqual([1, 2, 3]);

    // A bad slide is rejected with an actionable message, and nothing is created.
    const badCreate = await call(request, key, "klikr_create_presentation", {
      title: "Should not exist",
      slides: [{ type: "quiz", question: "Q", options: ["A", "B"], correct_answer: "C" }],
    });
    expect(badCreate.isError).toBe(true);
    expect(badCreate.text).toMatch(/slides\[0\].*must exactly match/);

    // Read it back.
    const got = await call(request, key, "klikr_get_presentation", { presentation_id: made.data.id });
    expect(got.data.slides).toHaveLength(3);
    const [quiz, poll, rating] = got.data.slides;
    expect(quiz).toMatchObject({ type: "quiz", correct_answer: "4", game_mode: true, time_limit_s: 20 });

    // Insert a slide at the top, then edit the quiz.
    const inserted = await call(request, key, "klikr_add_slides", {
      presentation_id: made.data.id,
      position: 1,
      slides: [{ type: "wordcloud", question: "One word for today?" }],
    });
    expect(inserted.data.added[0].number).toBe(1);
    expect(inserted.data.slide_count).toBe(4);

    const edited = await call(request, key, "klikr_update_slide", {
      slide_id: quiz.id,
      options: ["4", "22", "8"],
      correct_answer: "4",
      time_limit_s: 15,
    });
    expect(edited.data.updated).toMatchObject({ number: 2, options: ["4", "22", "8"], correct_answer: "4", time_limit_s: 15 });

    const badEdit = await call(request, key, "klikr_update_slide", { slide_id: quiz.id, options: ["1", "2"] });
    expect(badEdit.isError).toBe(true);
    expect(badEdit.text).toMatch(/correct_answer/);

    // Reorder: rating first.
    const after = await call(request, key, "klikr_get_presentation", { presentation_id: made.data.id });
    const ids = after.data.slides.map((s: { id: string }) => s.id);
    const reordered = [rating.id, ...ids.filter((i: string) => i !== rating.id)];
    const ro = await call(request, key, "klikr_reorder_slides", { presentation_id: made.data.id, slide_ids: reordered });
    expect(ro.data.order.map((o: { id: string }) => o.id)).toEqual(reordered);
    const badOrder = await call(request, key, "klikr_reorder_slides", { presentation_id: made.data.id, slide_ids: [rating.id] });
    expect(badOrder.isError).toBe(true);

    // Duplicate copies every slide under a new code.
    const dup = await call(request, key, "klikr_duplicate_presentation", { presentation_id: made.data.id });
    created.push(dup.data.id);
    expect(dup.data.slide_count).toBe(4);
    expect(dup.data.code).not.toBe(made.data.code);

    // Delete renumbers the rest.
    const del = await call(request, key, "klikr_delete_slide", { slide_id: poll.id });
    expect(del.data.slide_count).toBe(3);
    const final = await call(request, key, "klikr_get_presentation", { presentation_id: made.data.id });
    expect(final.data.slides.map((s: { number: number }) => s.number)).toEqual([1, 2, 3]);
    expect(final.data.slides[0].id).toBe(rating.id);

    // Listing shows both decks with slide counts.
    const list = await call(request, key, "klikr_list_presentations", {});
    const mine = list.data.presentations.filter((p: { id: string }) => created.includes(p.id));
    expect(mine.map((p: { slide_count: number }) => p.slide_count).sort()).toEqual([3, 4]);

    // Another user can't see or touch it.
    const foreign = await call(request, otherKey, "klikr_get_presentation", { presentation_id: made.data.id });
    expect(foreign.isError).toBe(true);
    const foreignEdit = await call(request, otherKey, "klikr_update_slide", { slide_id: rating.id, question: "hijacked" });
    expect(foreignEdit.isError).toBe(true);
  });
});
