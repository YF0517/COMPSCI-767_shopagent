import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../server.js";

describe("GET /auth/config", () => {
  it("returns clientId", async () => {
    const res = await request(app).get("/auth/config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("clientId");
  });
});

describe("POST /api/v1/messages", () => {
  it("returns 400 without messages field", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).post("/api/v1/messages").send({});
    expect(res.status).toBe(400);
    spy.mockRestore();
  });

  it("returns 200 with valid payload", async () => {
    const res = await request(app).post("/api/v1/messages").send({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say hi" }],
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("content");
  });

  it("returns structured response with text block", async () => {
    const res = await request(app).post("/api/v1/messages").send({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: "Reply with just the word: hello" }],
    });
    expect(res.status).toBe(200);
    const textBlock = res.body.content?.find(b => b.type === "text");
    expect(textBlock).toBeDefined();
    expect(typeof textBlock.text).toBe("string");
    expect(textBlock.text.length).toBeGreaterThan(0);
  });
});