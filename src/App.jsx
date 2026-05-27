import { useState, useRef } from "react";
import React from "react";
import {
  callReceiptAgent, fetchGmailReceipts,
  generateCSV, downloadCSV, QUIZ_QUESTIONS,
  createRunLog, logStep, finaliseLog, getStoredLogs,
} from "./agent.js";
import { getGmailToken } from "./GoogleAuth.jsx";


function Dot({ delay }) {
  return <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#bbb", display: "inline-block", animation: `pulse 0.8s ${delay}s ease-in-out infinite alternate` }} />;
}
function ThinkingDots() {
  return <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>{[0,1,2].map(i => <Dot key={i} delay={i*0.15}/>)}</span>;
}


function StepBar({ step }) {
  const steps = ["Gmail", "Select", "Quiz", "Results"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {steps.map((label, i) => {
        const active = i === step, done = i < step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#1a1a1a" : active ? "#1a1a1a" : "#e8e8e8",
                color: done || active ? "#fff" : "#999",
                fontSize: 11, fontWeight: 700,
              }}>{done ? "✓" : i + 1}</div>
              <span style={{ fontSize: 10, color: active ? "#1a1a1a" : "#bbb", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "#1a1a1a" : "#e8e8e8", margin: "0 6px", marginBottom: 16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}


function GmailStep({ onConnect, loading, status }) {
  return (
    <div className="fade-up">
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>Connect your Gmail</div>
      <div style={{ fontSize: 14, color: "#888", marginBottom: 28, lineHeight: 1.6 }}>
        ShopAgent reads your <strong style={{ color: "#1a1a1a" }}>shopping & receipt emails</strong> to learn what you love, then finds you smarter deals on the same things.
      </div>
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Sign in with Google</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
          A Google sign-in popup will appear.<br/>
          ShopAgent only requests read-only Gmail access.
        </div>
        <button onClick={onConnect} disabled={loading} style={{
          padding: "12px 28px", borderRadius: 10, border: "none",
          background: loading ? "#e8e8e8" : "#1a1a1a",
          color: loading ? "#aaa" : "#fff",
          fontSize: 14, fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          width: "100%",
        }}>
          {loading
            ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><ThinkingDots /> {status || "Connecting…"}</span>
            : "Sign in with Google →"}
        </button>
      </div>
    </div>
  );
}


function SelectStep({ emails, onContinue }) {
  const [selected, setSelected] = useState(() => new Set(emails.map((_, i) => i)));

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === emails.length) setSelected(new Set());
    else setSelected(new Set(emails.map((_, i) => i)));
  };

  return (
    <div className="fade-up">
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>Choose emails to analyse</div>
      <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>
        Found <strong style={{ color: "#1a1a1a" }}>{emails.length} shopping emails</strong>. Untick any you'd rather exclude.
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#888" }}>{selected.size} of {emails.length} selected</span>
        <button onClick={toggleAll} style={{ fontSize: 12, color: "#1a1a1a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          {selected.size === emails.length ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, maxHeight: 380, overflowY: "auto" }}>
        {emails.map((email, i) => (
          <div key={i} onClick={() => toggle(i)} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "12px 14px", borderRadius: 10, cursor: "pointer",
            background: selected.has(i) ? "#fff" : "#fafafa",
            border: `1px solid ${selected.has(i) ? "#e8e8e8" : "#f0f0f0"}`,
            opacity: selected.has(i) ? 1 : 0.5, transition: "all 0.15s",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
              border: `2px solid ${selected.has(i) ? "#1a1a1a" : "#ccc"}`,
              background: selected.has(i) ? "#1a1a1a" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {selected.has(i) && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.merchant}</div>
                {email.amount && <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{email.amount}</div>}
              </div>
              {email.products?.length > 0
                ? <div style={{ fontSize: 12, color: "#555", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.products.join(", ")}</div>
                : email.items && <div style={{ fontSize: 12, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.items}</div>
              }
              {email.date && <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{email.date}</div>}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onContinue(emails.filter((_, i) => selected.has(i)))}
        disabled={selected.size === 0}
        style={{
          width: "100%", padding: "13px", borderRadius: 10, border: "none",
          background: selected.size === 0 ? "#e8e8e8" : "#1a1a1a",
          color: selected.size === 0 ? "#aaa" : "#fff",
          fontSize: 14, fontWeight: 600, cursor: selected.size === 0 ? "not-allowed" : "pointer",
        }}>
        Analyse {selected.size} email{selected.size !== 1 ? "s" : ""} →
      </button>
    </div>
  );
}


function QuizStep({ onComplete }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const q = QUIZ_QUESTIONS[idx];

  function pick(opt) {
    const next = { ...answers, [q.id]: opt };
    setAnswers(next);
    if (idx < QUIZ_QUESTIONS.length - 1) setTimeout(() => setIdx(i => i + 1), 220);
    else setTimeout(() => onComplete(next), 220);
  }

  return (
    <div className="fade-up">
      <div style={{ height: 3, background: "#e8e8e8", borderRadius: 2, marginBottom: 28, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(idx / QUIZ_QUESTIONS.length) * 100}%`, background: "#1a1a1a", borderRadius: 2, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Question {idx + 1} of {QUIZ_QUESTIONS.length}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 24, lineHeight: 1.4 }}>{q.question}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map(opt => (
          <button key={opt} onClick={() => pick(opt)} className="suggestion" style={{
            textAlign: "left", padding: "13px 16px", borderRadius: 10,
            border: `1px solid ${answers[q.id] === opt ? "#1a1a1a" : "#e8e8e8"}`,
            background: answers[q.id] === opt ? "#1a1a1a" : "#fff",
            color: answers[q.id] === opt ? "#fff" : "#333",
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}>{opt}</button>
        ))}
      </div>
      <button onClick={() => onComplete(answers)} style={{
        marginTop: 16, width: "100%", padding: "10px", borderRadius: 10,
        border: "1px solid #e8e8e8", background: "none",
        fontSize: 13, color: "#aaa", cursor: "pointer", fontFamily: "inherit",
      }}>Skip remaining questions</button>
    </div>
  );
}


function ProductCard({ product }) {
  const [open, setOpen] = useState(false);
  const score = product.match_score;
  const scoreColor = score >= 85 ? "#2a7a4b" : score >= 70 ? "#b07a10" : "#c44";
  const tagColors = { similar: "#7c3aed", complement: "#2a7a4b", upgrade: "#4f46e5", cheaper_store: "#0891b2", dupe: "#be185d", loyalty: "#2a7a4b", bulk: "#b07a10", timing: "#0891b2" };
  const tagColor = tagColors[product.saving_type] || "#888";

  return (
    <div className="card" style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, overflow: "hidden", transition: "box-shadow 0.2s" }}>
      {/* Card header */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>{product.brand}</span>
              {product.saving_type && (
                <span style={{ fontSize: 10, color: tagColor, border: `1px solid ${tagColor}`, borderRadius: 4, padding: "1px 7px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {product.saving_type.replace("_", " ")}
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3, letterSpacing: "-0.01em" }}>{product.name}</div>
            {product.inspired_by && (
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                Because you bought: <span style={{ color: "#888", fontStyle: "italic" }}>{product.inspired_by}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{product.price}</div>
            {product.saves && <div style={{ fontSize: 11, color: "#2a7a4b", marginTop: 2, fontWeight: 600 }}>Saves {product.saves}</div>}
            <div style={{ fontSize: 11, color: scoreColor, marginTop: 2 }}>{score}% match</div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div style={{ fontSize: 13, color: "#555", marginTop: 10, lineHeight: 1.6 }}>{product.description}</div>
        )}

        {/* Why */}
        <div style={{ fontSize: 13, color: "#888", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>{product.why}</div>
      </div>

      {/* Where to buy */}
      {product.where_to_buy?.length > 0 && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f5f5f5", marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#aaa", marginRight: 2 }}>Available at:</span>
          {product.where_to_buy.map((store, i) => (
            <span key={i} style={{ fontSize: 11, background: "#f5f5f5", borderRadius: 4, padding: "2px 8px", color: "#555" }}>{store}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "10px 16px 14px", display: "flex", alignItems: "center", gap: 14 }}>
        <a href={product.link} target="_blank" rel="noopener noreferrer" className="link"
          style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 600, textDecoration: "none" }}>
          Find it online →
        </a>
        <button onClick={() => setOpen(v => !v)} style={{ fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          {open ? "Hide pros & cons" : "Show pros & cons"}
        </button>
      </div>

      {/* Pros / cons */}
      {open && (
        <div style={{ padding: "12px 16px 14px", borderTop: "1px solid #f5f5f5", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {product.pros?.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, color: "#2a7a4b" }}>
              <span style={{ flexShrink: 0 }}>✓</span><span>{p}</span>
            </div>
          ))}
          {product.cons?.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, color: "#b07a10", marginTop: 2 }}>
              <span style={{ flexShrink: 0 }}>!</span><span>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function ResultsStep({ result, onReset }) {
  const profile = result?.spending_profile;
  const handleCSV = () => {
    if (!result?.products) return;
    downloadCSV(generateCSV(result.products, profile), `shopagent-deals-${new Date().toISOString().split("T")[0]}.csv`);
  };
  return (
    <div className="fade-up">
      {profile && (
        <div style={{ background: "#f0faf4", border: "1px solid #d1fae5", borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#065f46", marginBottom: 8 }}>💰 Your spending snapshot</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#374151" }}>
            <div><span style={{ color: "#6b7280" }}>Monthly est. </span><strong>{profile.avg_transaction}</strong></div>
            <div><span style={{ color: "#6b7280" }}>Could save </span><strong style={{ color: "#065f46" }}>{profile.potential_savings}</strong></div>
            <div><span style={{ color: "#6b7280" }}>Top spend </span><strong>{(profile.top_categories || []).slice(0, 2).join(", ")}</strong></div>
          </div>
          {profile.lifestyle_signals && <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>{profile.lifestyle_signals}</div>}
        </div>
      )}
      {result?.reasoning && <div style={{ fontSize: 13, color: "#888", fontStyle: "italic", marginBottom: 16, lineHeight: 1.6 }}>{result.reasoning}</div>}
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {result?.products?.map((p, i) => <ProductCard key={i} product={p} />)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleCSV} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #e8e8e8", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ Export CSV</button>
        <button onClick={onReset} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>↺ Start over</button>
      </div>
    </div>
  );
}


function ArchPanel({ onClose }) {
  const logs = getStoredLogs();
  const [tab, setTab] = React.useState("arch");

  const tabStyle = (t) => ({
    padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
    background: tab === t ? "#1a1a1a" : "#f0f0f0",
    color: tab === t ? "#fff" : "#555",
    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 580, maxHeight: "85vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>System Info</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          <button style={tabStyle("arch")} onClick={() => setTab("arch")}>Architecture</button>
          <button style={tabStyle("logs")} onClick={() => setTab("logs")}>Eval Logs ({logs.length})</button>
          <button style={tabStyle("limits")} onClick={() => setTab("limits")}>Limitations</button>
        </div>

        {tab === "arch" && (
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "#444" }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#1a1a1a" }}>Problem</div>
            <p style={{ marginBottom: 12 }}>People spend money on things they love but miss better deals or complementary products. Manual research is time-consuming. An agentic approach is appropriate because the solution requires multi-step reasoning: reading emails, extracting meaning, understanding taste, and generating personalised recommendations — not a single-turn query.</p>

            <div style={{ fontWeight: 700, marginBottom: 8, color: "#1a1a1a" }}>Architecture</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {[
                [" Google OAuth", "User authenticates with Gmail read-only scope via Google Identity Services popup"],
                ["Gmail REST API", "Fetches up to 25 receipt emails (subject, sender, snippet) — no full body read"],
                [" Claude (Extraction)", "claude-haiku-4-5 parses email metadata → structured receipt JSON with product names"],
                [" Preference Quiz", "3 targeted questions capture taste profile and deal preferences"],
                ["Claude (Analysis)", "claude-haiku-4-5 + shop-agent.md system prompt → 3 personalised recommendations"],
                ["CSV Export", "Full recommendation data exported with match scores, inspired_by, where_to_buy"],
                ["Eval Logger", "Each run logged to localStorage with timing, step trace, and success metrics"],
              ].map(([name, desc]) => (
                <div key={name} style={{ background: "#f9f9f9", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{name}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ fontWeight: 700, marginBottom: 8, color: "#1a1a1a" }}>Agentic Behaviours</div>
            <div style={{ fontSize: 12, color: "#555", display: "flex", flexDirection: "column", gap: 4 }}>
              {["✓ Multi-step pipeline: OAuth → fetch → extract → quiz → analyse → output", "✓ Tool use: Gmail API + Claude AI as distinct tools", "✓ Memory: quiz answers + receipt history carried across steps", "✓ Decision-making: filters non-purchase emails, scores product matches", "✓ Planning: two-phase Claude calls (extract then recommend)"].map(t => <div key={t}>{t}</div>)}
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div>
            {logs.length === 0 ? (
              <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "24px 0" }}>No runs logged yet. Complete a full analysis to see evaluation data.</div>
            ) : logs.map((log, i) => (
              <div key={i} style={{ background: "#f9f9f9", borderRadius: 10, padding: "12px 14px", marginBottom: 10, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: log.success ? "#2a7a4b" : "#c44" }}>{log.success ? "✓ Success" : "✗ Failed"}</span>
                  <span style={{ color: "#aaa" }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ color: "#555", display: "flex", flexDirection: "column", gap: 3 }}>
                  <div>Emails: {log.inputs.emails_fetched} fetched → {log.inputs.emails_selected} selected</div>
                  <div>Duration: {log.duration_ms}ms</div>
                  {log.result && <>
                    <div>Products returned: {log.result.products_returned} | Avg match: {log.result.avg_match_score}%</div>
                    <div>Types: {log.result.saving_types_used?.join(", ")}</div>
                  </>}
                  {log.error && <div style={{ color: "#c44" }}>Error: {log.error}</div>}
                  <div style={{ color: "#aaa" }}>Steps: {log.steps?.map(s => s.step).join(" → ")}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "limits" && (
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "#444" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Email snippet only", "Gmail extraction uses subject + 100-char snippet. Full email body (with itemised products) is not read — some product names are missed."],
                ["OAuth token expiry", "Google OAuth tokens expire after 1 hour. Long sessions will fail silently without a token refresh mechanism."],
                ["Hallucination risk", "Claude may invent product details or prices not grounded in real data. Recommendations should be verified before purchase."],
                ["Australia-only pricing", "Prices are estimated for the Australian market. Results may be inaccurate for users in other regions."],
                ["25 email cap", "Only the 25 most recent matching emails are fetched. Heavy shoppers may have important receipts missed."],
                ["No persistent memory", "User profile is not saved between sessions. Each run starts fresh — no long-term taste learning."],
                ["Haiku model limits", "Using claude-haiku-4-5 for cost. Larger models (Sonnet) would produce more accurate product extraction and reasoning."],
              ].map(([title, desc]) => (
                <div key={title} style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#c44" }}>⚠ {title}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep]             = useState(0);
  const [allEmails, setAllEmails]   = useState([]);
  const [chosenEmails, setChosenEmails] = useState([]);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError]           = useState(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailStatus, setGmailStatus]   = useState("");
  const [gmailToken, setGmailToken]     = useState(null);
  // const [showArch, setShowArch]         = useState(false);
  // const [runLog, setRunLog]             = useState(null);

  async function handleGmailConnect() {
    setGmailLoading(true); setError(null);
    try {
      // 1. Get Google Client ID from backend
      setGmailStatus("Loading auth config…");
      const configRes = await fetch("/auth/config");
      const { clientId } = await configRes.json();
      if (!clientId) throw new Error("Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.");

      // 2. Google OAuth popup → get access token
      setGmailStatus("Waiting for Google sign-in…");
      const token = await getGmailToken(clientId);
      setGmailToken(token);
      const gmailToken = token;

      // 3. Fetch receipts with token
      setGmailStatus("Scanning receipt emails…");
      const data = await fetchGmailReceipts({ onStatus: setGmailStatus, gmailToken });
      setAllEmails(data.receipts || []);
      setStep(1);
    } catch (err) {
      setError("Gmail sync failed: " + err.message);
    } finally {
      setGmailLoading(false); setGmailStatus("");
    }
  }

  async function handleQuizComplete(quizAnswers) {
    setLoading(true); setError(null);
    setLoadingMsg("Analysing your spending patterns…");
    const log = createRunLog({ emailCount: allEmails.length, selectedCount: chosenEmails.length, quizAnswers });
    logStep(log, "quiz_complete");
    try {
      const textReceipts = chosenEmails.map(r =>
        `${r.merchant} ${r.amount}${r.date ? ` (${r.date})` : ""}${r.items ? ` — ${r.items}` : ""}`
      );
      logStep(log, "calling_claude", { receipt_count: textReceipts.length });
      const res = await callReceiptAgent({ textReceipts: [], fileReceipts: [], quizAnswers, selectedEmails: chosenEmails, gmailToken });
      logStep(log, "recommendations_received", { count: res.products?.length });
      finaliseLog(log, { result: res });
      setResult(res); setStep(3);
    } catch (err) {
      finaliseLog(log, { error: err });
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  }

  function handleReset() {
    setStep(0); setAllEmails([]); setChosenEmails([]);
    setResult(null); setError(null);
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f6f6f3; }
        input:focus, textarea:focus, button:focus { outline: none; }
        .suggestion:hover { background: #f0efe9 !important; border-color: #ddd !important; }
        .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .link:hover { text-decoration: underline; }
        @keyframes pulse { from { opacity:0.4; transform:scale(0.8); } to { opacity:1; transform:scale(1.2); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.3s ease; }
      `}</style>
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "36px 20px 80px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14, color: "#1a1a1a", lineHeight: 1.6 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>ShopAgent</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 1 }}>Smarter spending from your receipts</div>
        </div>
        <StepBar step={step} />
        {error && (
          <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#c44" }}>
            ⚠️ {error}
          </div>
        )}
        {loading && (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <ThinkingDots />
            <div style={{ fontSize: 13, color: "#888", marginTop: 16 }}>{loadingMsg}</div>
          </div>
        )}
        {!loading && step === 0 && <GmailStep onConnect={handleGmailConnect} loading={gmailLoading} status={gmailStatus} />}
        {!loading && step === 1 && <SelectStep emails={allEmails} onContinue={(emails) => { setChosenEmails(emails); setStep(2); }} />}
        {!loading && step === 2 && <QuizStep onComplete={handleQuizComplete} />}
        {!loading && step === 3 && result && <ResultsStep result={result} onReset={handleReset} />}
      </div>
    </>
  );
}