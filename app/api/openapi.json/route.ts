import { NextResponse } from "next/server";

/**
 * OpenAPI 3.1 spec for the public Klikr API.
 * Served at /api/openapi.json so AI agents and OpenAPI viewers can discover
 * the surface without crawling the source. Kept inline so it's always
 * deployed in lock-step with the route handlers it documents.
 */
const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Klikr API",
    version: "1.0.0",
    description:
      "Programmatic access to Klikr presentations, slides, responses, and live session control. Authenticate every request with `Authorization: Bearer klikr_pk_...` (mint a key at /dashboard/api-keys).",
  },
  servers: [{ url: "https://klikrapp.com" }],
  components: {
    securitySchemes: {
      apiKey: { type: "http", scheme: "bearer", bearerFormat: "klikr_pk_<token>" },
    },
    schemas: {
      Presentation: {
        type: "object",
        required: ["id", "title", "code", "state", "created_at"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          code: { type: "string", description: "6-char join code." },
          state: { type: "string", enum: ["lobby", "active", "closed"] },
          current_slide_id: { type: "string", format: "uuid", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Slide: {
        type: "object",
        required: ["id", "presentation_id", "position", "type", "question", "config"],
        properties: {
          id: { type: "string", format: "uuid" },
          presentation_id: { type: "string", format: "uuid" },
          position: { type: "integer", minimum: 0 },
          type: { type: "string", enum: ["mcq", "wordcloud", "open", "quiz", "qa", "rating", "embed", "ranking"] },
          question: { type: "string" },
          config: { type: "object", additionalProperties: true },
          image_url: { type: "string", nullable: true },
          kahoot_mode: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Response: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slide_id: { type: "string", format: "uuid" },
          value_index: { type: "integer", nullable: true },
          value_text: { type: "string", nullable: true },
          status: { type: "string" },
          flagged: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ apiKey: [] }],
  paths: {
    "/api/v1/presentations": {
      get: {
        summary: "List your presentations",
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { presentations: { type: "array", items: { $ref: "#/components/schemas/Presentation" } } } } } } } },
      },
      post: {
        summary: "Create a presentation",
        requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" } } } } } },
        responses: { "201": { description: "Created", content: { "application/json": { schema: { type: "object", properties: { presentation: { $ref: "#/components/schemas/Presentation" } } } } } } },
      },
    },
    "/api/v1/presentations/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: { summary: "Fetch a presentation", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
      patch: {
        summary: "Update title or state",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, state: { type: "string", enum: ["lobby", "active", "closed"] } } } } } },
        responses: { "200": { description: "OK" }, "404": { description: "Not found" } },
      },
      delete: { summary: "Delete a presentation", responses: { "204": { description: "Deleted" }, "404": { description: "Not found" } } },
    },
    "/api/v1/presentations/{id}/slides": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: { summary: "List slides", responses: { "200": { description: "OK" } } },
      post: {
        summary: "Append or insert a slide",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: {
                  type: { type: "string", enum: ["mcq", "wordcloud", "open", "quiz", "qa", "rating", "embed", "ranking"] },
                  question: { type: "string" },
                  config: { type: "object", additionalProperties: true },
                  position: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/slides/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: { summary: "Fetch a slide", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
      patch: {
        summary: "Update a slide's question, config, position, image, or kahoot mode",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { question: { type: "string" }, config: { type: "object" }, position: { type: "integer" }, image_url: { type: "string", nullable: true }, kahoot_mode: { type: "boolean" } } } } } },
        responses: { "200": { description: "OK" }, "404": { description: "Not found" } },
      },
      delete: { summary: "Delete a slide", responses: { "204": { description: "Deleted" }, "404": { description: "Not found" } } },
    },
    "/api/v1/presentations/{id}/responses": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "slide_id", in: "query", required: false, schema: { type: "string", format: "uuid" } },
      ],
      get: { summary: "List responses for a presentation, optionally filtered by slide", responses: { "200": { description: "OK" } } },
    },
    "/api/v1/presentations/{id}/session": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      post: {
        summary: "Drive the live session: start, advance, jump, or end",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["start", "next", "prev", "end", "goto"] },
                  slide_id: { type: "string", format: "uuid", description: "Required when action=goto." },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "400": { description: "Invalid transition" }, "404": { description: "Not found" } },
      },
    },
  },
} as const;

export async function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json",
    },
  });
}
