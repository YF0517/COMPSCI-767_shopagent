import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../server.js";

describe("GET /auth/config", () => {
  it("returns clientId with status 200", async () => {
    const res = await request(app).get("/auth/config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("clientId");
  });
});

describe("POST /api/v1/messages", () => {

  it("returns 400 when body is empty", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).post("/api/v1/messages").send({});
    expect(res.status).toBe(400);
    spy.mockRestore();
  });

  it("returns error for invalid model name", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).post("/api/v1/messages").send({
      model: "fake-model-xyz",
      max_tokens: 100,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(res.status).not.toBe(200);
    spy.mockRestore();
  });

  it("returns error when messages field is missing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).post("/api/v1/messages").send({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
    });
    expect(res.status).not.toBe(200);
    spy.mockRestore();
  });
  it("returns 200 with text content for valid payload", async () => {
    const res = await request(app).post("/api/v1/messages").send({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello in one word" }],
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("content");
    const textBlock = res.body.content?.find(b => b.type === "text");
    expect(textBlock).toBeDefined();
    expect(typeof textBlock.text).toBe("string");
    expect(textBlock.text.length).toBeGreaterThan(0);
  });

  it("responds within 5 seconds", async () => {
    const start = Date.now();
    const res = await request(app).post("/api/v1/messages").send({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hi" }],
    });
    const duration = Date.now() - start;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(5000);
    console.log(`⏱ Response time: ${duration}ms`);
  });

  it("returns 3 product recommendations from real receipt data", async () => {
    const res = await request(app).post("/api/v1/messages").send({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: `You are a shopping assistant. Return ONLY valid JSON with no markdown:
{"products": [{"name": "string", "brand": "string", "why": "string"}]}`,
      messages: [{ role: "user", content: `I bought these from Sephora NZ:
- DIOR Addict Lip Glow Lip Balm 038 Soft Nude $74.00
- MAKE UP FOR EVER Mist & Fix Matte Setting Spray 100ml $63.00
- DIOR Rouge Blush 100 Nude Look $105.00
Recommend exactly 3 similar products I would love.` }],
    });
    expect(res.status).toBe(200);
    const textBlock = res.body.content?.find(b => b.type === "text");
    expect(textBlock).toBeDefined();
    const parsed = JSON.parse(textBlock.text.replace(/```json|```/g, "").trim());
    expect(Array.isArray(parsed.products)).toBe(true);
    expect(parsed.products.length).toBe(3);
    expect(parsed.products[0]).toHaveProperty("name");
    expect(parsed.products[0]).toHaveProperty("brand");
    expect(parsed.products[0]).toHaveProperty("why");
    expect(parsed.products[0].name.length).toBeGreaterThan(0);
    console.log("✅ Recommendations received:");
    parsed.products.forEach((p, i) => console.log(`  ${i + 1}. ${p.brand} — ${p.name}`));
  });

});