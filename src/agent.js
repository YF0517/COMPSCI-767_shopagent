import SYSTEM_PROMPT  from "../promp/shop-agent.md?raw"
import EXTRACTOR_PROMPT from "../promp/receipt-extractor.md?raw"
export { SYSTEM_PROMPT }

export const QUIZ_QUESTIONS = [
  {
    id: "top_love",
    question: "What do you love buying most?",
    options: ["Beauty & skincare", "Fashion & clothing", "Food & dining", "Tech & gadgets", "Health & fitness", "Home & lifestyle"],
  },
  {
    id: "deal_style",
    question: "How do you prefer to save on things you love?",
    options: ["Find a cheaper store for the same thing", "Try a dupe or alternative brand", "Use loyalty points & cashback", "Buy in bulk or on subscription", "Wait for sales & seasonal deals"],
  },
  {
    id: "quality_bar",
    question: "When it comes to alternatives, what matters most?",
    options: ["Identical quality, lower price", "Similar quality is fine if it's much cheaper", "Same brand, just better deal", "I'll try anything once", "Quality first, savings second"],
  },
];

async function claudeCall(body) {
  const res = await fetch("/api/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4000, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}
 
function parseJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function fetchGmailReceipts({ onStatus, gmailToken } = {}) {
  onStatus?.("Searching Gmail for receipts…");
 
  const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
  const headers = { Authorization: `Bearer ${gmailToken}` };
  const query = encodeURIComponent(
    "subject:(receipt OR order OR invoice OR confirmation OR payment OR shipped) newer_than:120d -category:promotions -category:social"
  );
 
  const listRes = await fetch(`${GMAIL}/messages?q=${query}&maxResults=50`, { headers });
  if (!listRes.ok) throw new Error("Gmail search failed: " + listRes.status);
  const listData = await listRes.json();
  const messages = listData.messages || [];
 
  if (messages.length === 0) return { receipts: [], summary: "No receipt emails found in the last 120 days." };
 
  onStatus?.(`Found ${messages.length} emails — extracting details…`);
 
  function decodeBase64(str) {
    try { return decodeURIComponent(escape(atob(str.replace(/-/g, "+").replace(/_/g, "/")))); } catch { return ""; }
  }
  function extractBody(payload) {
    if (!payload) return "";
    if (payload.mimeType === "text/plain" && payload.body?.data) {
      return decodeBase64(payload.body.data);
    }
    if (payload.parts) {
      const allParts = [];
      function collectParts(p) { allParts.push(p); if (p.parts) p.parts.forEach(collectParts); }
      payload.parts.forEach(collectParts);
      const plain = allParts.find(p => p.mimeType === "text/plain" && p.body?.data);
      if (plain) return decodeBase64(plain.body.data);
      const html = allParts.find(p => p.mimeType === "text/html" && p.body?.data);
      if (html) {
        const raw = decodeBase64(html.body.data);
        const noScript = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
        const spaced = noScript.replace(/<\/?(tr|td|th|li|p|div|br|h[1-6])[^>]*>/gi, " | ");
        return spaced.replace(/<[^>]+>/g, "")
                     .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
                     .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                     .replace(/&[a-z]+;/gi, " ")
                     .replace(/[ \t]+/g, " ").replace(/(\s*\|\s*)+/g, " | ")
                     .trim();
      }
    }
    if (payload.body?.data) return decodeBase64(payload.body.data);
    return "";
  }
 
  const emailDetails = await Promise.all(
    messages.slice(0, 40).map(async ({ id }) => {
      try {
        const r = await fetch(`${GMAIL}/messages/${id}?format=full`, { headers });
        if (!r.ok) return null;
        const d = await r.json();
        const hdrs = Object.fromEntries((d.payload?.headers || []).map(h => [h.name, h.value]));
        const body = extractBody(d.payload).replace(/\s+/g, " ").trim().slice(0, 3000);
        return { id, subject: hdrs.Subject || "", from: hdrs.From || "", date: hdrs.Date || "", snippet: d.snippet || "", body };
      } catch { return null; }
    })
  );
 
  const validEmails = emailDetails.filter(Boolean);
  const emailText = validEmails.map(e =>
    `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nSnippet: ${e.snippet}\nBody: ${e.body}`
  ).join("\n\n---\n\n");
 
  onStatus?.("Analysing emails with AI…");
 
 const data = await claudeCall({
    system: EXTRACTOR_PROMPT,
    messages: [{ role: "user", content: `Extract receipt data and specific product names from these emails:\n\n${emailText}` }],
  });
 
  onStatus?.("Done!");
  const raw = data.content?.find(b => b.type === "text")?.text || "";
  try {
    const parsed = parseJSON(raw);
    // Merge ids back so App can pass them for body fetching
    if (parsed.receipts) {
      parsed.receipts = parsed.receipts.map((r, i) => ({
        ...r,
        id: validEmails[i]?.id || null,
        snippet: validEmails[i]?.snippet || "",
      }));
    }
    return parsed;
  } catch {
    return { receipts: [], summary: "Could not parse email data." };
  }
}
 
export async function callReceiptAgent({ textReceipts = [], fileReceipts = [], quizAnswers = {}, selectedEmails = [], gmailToken = null }) {
 
  // Fetch full body for selected emails to get actual product names
  if (selectedEmails.length > 0 && gmailToken) {
    const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
    const authHeaders = { Authorization: `Bearer ${gmailToken}` };
 
    function decodeBase64(str) {
      try { return decodeURIComponent(escape(atob(str.replace(/-/g, "+").replace(/_/g, "/")))); } catch { return ""; }
    }
    function extractBody(payload) {
      if (!payload) return "";
      if (payload.mimeType === "text/plain" && payload.body?.data) return decodeBase64(payload.body.data);
      if (payload.parts) { for (const p of payload.parts) { const t = extractBody(p); if (t) return t; } }
      if (payload.body?.data) return decodeBase64(payload.body.data);
      return "";
    }
 
    const enriched = await Promise.all(selectedEmails.map(async (e) => {
      if (!e.id) return e;
      try {
        const r = await fetch(`${GMAIL}/messages/${e.id}?format=full`, { headers: authHeaders });
        if (!r.ok) return e;
        const d = await r.json();
        const body = extractBody(d.payload).replace(/\s+/g, " ").trim().slice(0, 800);
        return { ...e, body };
      } catch { return e; }
    }));
 
    textReceipts = enriched.map(e =>
      `Merchant: ${e.merchant} | Date: ${e.date} | Amount: ${e.amount}\nItems: ${e.items || ""}\nSnippet: ${e.snippet || ""}${e.body ? "\nBody: " + e.body : ""}`
    );
  }
 
  const content = [];
  for (const file of fileReceipts) {
    content.push({ type: file.type.startsWith("image/") ? "image" : "document",
      source: { type: "base64", media_type: file.type, data: file.base64 } });
  }
 
  const quizBlock = Object.keys(quizAnswers).length > 0
    ? "\n=== USER PREFERENCES ===\n" +
      QUIZ_QUESTIONS.filter(q => quizAnswers[q.id])
        .map(q => `${q.question}\nAnswer: ${quizAnswers[q.id]}`).join("\n\n")
    : "";
 
  const receiptBlock = textReceipts.length > 0
    ? "\n=== PURCHASE HISTORY (from Gmail receipts) ===\n" + textReceipts.join("\n\n---\n\n")
    : "\n=== NOTE ===\nNo receipt data provided.";
 
  content.push({
    type: "text",
    text: `Analyse my purchase history carefully. Identify the specific products I buy. Then recommend 3 products I would likely love — similar items, natural complements, or smarter deals on things I already buy. Be specific about product names, variants, and where to buy them in Australia.${quizBlock}${receiptBlock}`,
  });
 
  const data = await claudeCall({ system: SYSTEM_PROMPT, messages: [{ role: "user", content }] });
  const raw = data.content?.find(b => b.type === "text")?.text || "";
  try {
    return parseJSON(raw);
  } catch {
    throw new Error("Agent returned an unexpected format. Please try again.");
  }
}
 
// ─── CSV export ───────────────────────────────────────────────────────────────
export function generateCSV(products, spendingProfile) {
  const escape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const headers = ["Product","Brand","Category","Price","Est. Saving","Type","Inspired By","Why Recommended","Description","Pros","Cons","Where to Buy","Link"];
  const meta = [
    `"ShopAgent Deal Finder — ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}"`,
    `"Typical Spend: ${spendingProfile?.avg_transaction || "N/A"}"`,
    `"Potential Monthly Savings: ${spendingProfile?.potential_savings || "N/A"}"`,
    `"Top Categories: ${(spendingProfile?.top_categories || []).join(", ")}"`,
    "",
  ];
  const rows = products.map(p => [
    escape(p.name), escape(p.brand), escape(p.category), escape(p.price),
    escape(p.saves), escape(p.saving_type), escape(p.inspired_by), escape(p.why),
    escape(p.description), escape((p.pros||[]).join(" | ")), escape((p.cons||[]).join(" | ")),
    escape((p.where_to_buy||[]).join(" | ")), escape(p.link),
  ]);
  return [...meta, headers.map(escape).join(","), ...rows.map(r => r.join(","))].join("\n");
}
 
export function downloadCSV(csv, filename = "shopagent-deals.csv") {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
 
export function createRunLog({ emailCount, selectedCount, quizAnswers }) {
  return { run_id: `run_${Date.now()}`, timestamp: new Date().toISOString(),
    inputs: { emails_fetched: emailCount, emails_selected: selectedCount, quiz_answers: quizAnswers },
    steps: [], result: null, duration_ms: null, success: null, error: null, _start: Date.now() };
}
export function logStep(runLog, step, detail = {}) {
  runLog.steps.push({ step, at_ms: Date.now() - runLog._start, ...detail });
}
export function finaliseLog(runLog, { result, error }) {
  runLog.duration_ms = Date.now() - runLog._start;
  runLog.success = !error;
  runLog.error = error?.message || null;
  if (result) {
    runLog.result = {
      products_returned: result.products?.length || 0,
      avg_match_score: result.products
        ? Math.round(result.products.reduce((s, p) => s + (p.match_score || 0), 0) / result.products.length)
        : null,
      categories_identified: result.spending_profile?.top_categories || [],
      saving_types_used: result.products?.map(p => p.saving_type) || [],
    };
  }
  try {
    const logs = JSON.parse(localStorage.getItem("shopagent_logs") || "[]");
    logs.unshift(runLog);
    localStorage.setItem("shopagent_logs", JSON.stringify(logs.slice(0, 20)));
  } catch {}
  console.log("[ShopAgent Eval Log]", JSON.stringify(runLog, null, 2));
  return runLog;
}
export function getStoredLogs() {
  try { return JSON.parse(localStorage.getItem("shopagent_logs") || "[]"); } catch { return []; }
}