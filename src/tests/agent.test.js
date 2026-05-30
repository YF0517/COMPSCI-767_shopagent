import { describe, it, expect } from "vitest";
import { generateCSV, parseJSON } from "../agent.js";

describe("generateCSV", () => {
  it("generates correct headers", () => {
    const products = [{
      name: "COSRX Snail Essence",
      brand: "COSRX",
      category: "beauty",
      price: "$25",
      saves: "$10",
      saving_type: "dupe",
      inspired_by: "Sephora order",
      why: "Similar product",
      description: "Great moisturiser",
      pros: ["affordable"],
      cons: ["smaller size"],
      where_to_buy: ["YesStyle"],
      link: "https://google.com"
    }];
    const csv = generateCSV(products, { avg_transaction: "$50" });
    expect(csv).toContain("COSRX Snail Essence");
    expect(csv).toContain("beauty");
  });
});

describe("parseJSON", () => {
  it("strips markdown backticks", () => {
    // export parseJSON from agent.js first
    const raw = '```json\n{"test": true}\n```';
    expect(parseJSON(raw)).toEqual({ test: true });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJSON("not json")).toThrow();
  });
});