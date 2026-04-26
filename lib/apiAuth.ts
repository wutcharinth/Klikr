import { createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const KEY_PREFIX = "klikr_pk_";

/** Generate a fresh API key. Returned plaintext is shown to the user once. */
export function mintApiKey(): { plaintext: string; hash: string; prefix: string } {
  const random = randomBytes(32).toString("base64url"); // ~43 chars
  const plaintext = `${KEY_PREFIX}${random}`;
  const hash = sha256(plaintext);
  // Display prefix: the literal scheme + first 4 random chars, so the
  // dashboard can show "klikr_pk_aB3x…" without revealing the secret.
  const prefix = `${KEY_PREFIX}${random.slice(0, 4)}`;
  return { plaintext, hash, prefix };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export type ApiAuthResult =
  | { ok: true; userId: string; keyId: string }
  | { ok: false; status: number; message: string };

/**
 * Validate the `Authorization: Bearer …` header and resolve to a user.
 * Touches `last_used_at` opportunistically (best-effort, errors ignored).
 */
export async function authenticateRequest(req: Request): Promise<ApiAuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return { ok: false, status: 401, message: "Missing Bearer token." };
  }
  const token = match[1];
  if (!token.startsWith(KEY_PREFIX)) {
    return { ok: false, status: 401, message: "Invalid API key format." };
  }

  const hash = sha256(token);
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, status: 401, message: "Invalid API key." };
  }
  if (data.revoked_at) {
    return { ok: false, status: 401, message: "API key revoked." };
  }

  // Best-effort touch — don't block the request if this fails.
  svc.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});

  return { ok: true, userId: data.user_id, keyId: data.id };
}
