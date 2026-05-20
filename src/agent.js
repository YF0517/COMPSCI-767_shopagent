import SYSTEM_PROMPT from "../promp/shop-agent.md?raw"

export { SYSTEM_PROMPT };

// ─── Suggested starter queries ─────────────────────────────────────────────
export const SUGGESTIONS = [
  "Wireless headphones under $150 for working from home",
  "Running shoe for overpronation, I run 5k three times a week",
  "Gift for my dad who loves cooking, budget around $80",
  "Lightweight laptop for college — prefer Mac, around $1000",
  "Budget mechanical keyboard for coding, under $100",
  "Mirrorless camera for travel photography, beginner friendly",
];

// ─── Anthropic API call ─────────────────────────────────────────────────────
export async function callAgent({ userQuery, memory }) {
  const memoryContext =
    memory.length > 0
      ? `\n\nUser preference memory from previous searches:\n${memory.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
      : "";

  const response = await fetch("/api/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
     model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: SYSTEM_PROMPT + memoryContext,
      messages: [{ role: "user", content: userQuery }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content?.find((b) => b.type === "text")?.text || "";

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    throw new Error("Agent returned an unexpected format. Please try again.");
  }
}
