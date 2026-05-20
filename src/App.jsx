import { useState, useRef, useEffect } from "react";
import { callAgent, SUGGESTIONS } from "./agent.js";
import { ThinkingDots, ProductCard, MemoryPill } from "./components.jsx";

// ─── Global styles (injected once) ─────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a12; }
  html { scroll-behavior: smooth; }
  @keyframes bounce {
    0%,60%,100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  textarea { font-family: inherit; }
  textarea:focus { outline: none; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  .product-card:hover {
    border-color: rgba(167,139,250,0.35) !important;
    transition: border-color 0.2s;
  }
`;

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [query, setQuery]       = useState("");
  const [memory, setMemory]     = useState([]);   // persistent preference notes
  const [messages, setMessages] = useState([]);   // conversation history
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const bottomRef               = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Main search handler ────────────────────────────────────────────────
  async function handleSearch(override) {
    const userQuery = (override ?? query).trim();
    if (!userQuery || loading) return;

    setQuery("");
    setError(null);
    setMessages((prev) => [...prev, { type: "user", text: userQuery }]);
    setLoading(true);

    try {
      const result = await callAgent({ userQuery, memory });

      // Persist preference memory across turns
      if (result.memory_update) {
        setMemory((prev) => [...prev, result.memory_update]);
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "agent",
          reasoning: result.reasoning,
          products: result.products,
        },
      ]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  }

  const hasMessages = messages.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans', sans-serif",
          color: "#f1f5f9",
          background: "#0a0a12",
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            position: "sticky",
            top: 0,
            background: "rgba(10,10,18,0.95)",
            backdropFilter: "blur(8px)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🛍️
          </div>
          <div>
            <div
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 18,
                letterSpacing: "-0.01em",
              }}
            >
              ShopAgent
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              AI-powered personal shopper
            </div>
          </div>
          <MemoryPill count={memory.length} />
        </header>

        {/* ── Conversation area ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>

            {/* Welcome screen */}
            {!hasMessages && (
              <div
                style={{
                  textAlign: "center",
                  paddingTop: 48,
                  animation: "fadeIn 0.6s ease",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 32,
                    fontWeight: 400,
                    lineHeight: 1.2,
                    marginBottom: 10,
                    background: "linear-gradient(135deg,#a78bfa,#34d399)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  What are you shopping for?
                </div>
                <p style={{ color: "#64748b", fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
                  Tell me your needs, budget, and preferences.<br />
                  I'll reason through the options and find the best matches with links.
                </p>

                {/* Suggestion chips */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    maxWidth: 480,
                    margin: "0 auto",
                  }}
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSearch(s)}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        padding: "10px 16px",
                        color: "#94a3b8",
                        fontSize: 13,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(167,139,250,0.1)";
                        e.currentTarget.style.borderColor = "rgba(167,139,250,0.3)";
                        e.currentTarget.style.color = "#c4b5fd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "#94a3b8";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: 32 }}>

                {/* User bubble */}
                {msg.type === "user" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
                    <div
                      style={{
                        background: "rgba(124,58,237,0.18)",
                        border: "1px solid rgba(124,58,237,0.28)",
                        borderRadius: "14px 14px 4px 14px",
                        padding: "10px 16px",
                        maxWidth: "72%",
                        fontSize: 14,
                        color: "#e2e8f0",
                        lineHeight: 1.55,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* Agent response */}
                {msg.type === "agent" && (
                  <div style={{ animation: "fadeIn 0.4s ease" }}>

                    {/* Reasoning bubble */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        🛍️
                      </div>
                      <div
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: "4px 14px 14px 14px",
                          padding: "10px 15px",
                          maxWidth: "72%",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#7c3aed",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                          }}
                        >
                          Agent reasoning
                        </div>
                        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                          {msg.reasoning}
                        </p>
                      </div>
                    </div>

                    {/* Product grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: 14,
                      }}
                    >
                      {msg.products?.map((p, i) => (
                        <ProductCard key={i} product={p} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  🛍️
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "4px 14px 14px 14px",
                    padding: "10px 16px",
                    fontSize: 13,
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Searching for the best products <ThinkingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#fca5a5",
                  marginTop: 12,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Latest memory note */}
            {memory.length > 0 && hasMessages && !loading && (
              <div
                style={{
                  marginTop: 16,
                  padding: "8px 14px",
                  background: "rgba(124,58,237,0.06)",
                  border: "1px solid rgba(124,58,237,0.14)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "#7c3aed",
                }}
              >
                🧠 <strong>Remembered:</strong> {memory[memory.length - 1]}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </main>

        {/* ── Input bar ── */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(10,10,18,0.97)",
            padding: "14px 20px 18px",
          }}
        >
          <div
            style={{
              maxWidth: 860,
              margin: "0 auto",
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you're looking for… (budget, preferences, use case)"
              rows={2}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "10px 14px",
                color: "#f1f5f9",
                fontSize: 14,
                resize: "none",
                lineHeight: 1.5,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(167,139,250,0.45)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{
                height: 58,
                padding: "0 22px",
                borderRadius: 12,
                border: "none",
                background:
                  loading || !query.trim()
                    ? "rgba(167,139,250,0.15)"
                    : "linear-gradient(135deg,#7c3aed,#a78bfa)",
                color: loading || !query.trim() ? "#475569" : "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "Searching…" : "Find →"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#334155", marginTop: 8 }}>
            Press Enter to search · Agent remembers preferences across queries
          </p>
        </footer>
      </div>
    </>
  );
}
