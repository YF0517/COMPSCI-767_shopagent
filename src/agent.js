import SYSTEM_PROMPT from "../promp/shop-agent.md?raw"

export { SYSTEM_PROMPT };

// ─── Suggested starter queries ─────────────────────────────────────────────
export const SUGGESTIONS = [
  "Wireless headphones under $150 for working from home",
  "Running shoe for overpronation, I run 5k three times a week",
  "Lightweight laptop for college — prefer Mac, around $1000",
  "Budget mechanical keyboard for coding, under $100",
];

/// ─── Anthropic API call ─────────────────────────────────────────────────────
export async function callAgent({ userQuery, memory, fileBase64, fileType }) {
  const memoryContext =
    memory.length > 0
      ? `\n\nUser preference memory from previous searches:\n${memory.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
      : "";
 
  // Build message content — text only, or text + file (image or PDF)
  let userContent;
  if (fileBase64) {
    const isImage = fileType && fileType.startsWith("image/");
    userContent = [
      {
        type: isImage ? "image" : "document",
        source: {
          type: "base64",
          media_type: fileType,
          data: fileBase64,
        },
      },
      {
        type: "text",
        text: userQuery,
      },
    ];
  } else {
    userContent = userQuery;
  }
 
  const response = await fetch("/api/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: SYSTEM_PROMPT + memoryContext,
      messages: [{ role: "user", content: userContent }],
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