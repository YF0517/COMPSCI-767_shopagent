import { useState, useRef, useEffect } from "react";
import { callAgent, SUGGESTIONS } from "./agent.js";

export default function App() {
  const [query, setQuery]           = useState("");
  const [memory, setMemory]         = useState([]);
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [fileName, setFileName]     = useState(null);
  const [fileType, setFileType]     = useState(null);
  const bottomRef                   = useRef(null);
  const fileInputRef                = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result.split(",")[1]);
      setFileName(file.name);
      setFileType(file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearFile() { setFileBase64(null); setFileName(null); setFileType(null); }

  async function handleSearch(override) {
    const userQuery = (override ?? query).trim();
    if ((!userQuery && !fileBase64) || loading) return;
    setQuery("");
    setError(null);
    const displayText = userQuery
      ? fileBase64 ? `${userQuery} [+ ${fileName}]` : userQuery
      : `Analyse my receipt: ${fileName}`;
    setMessages((prev) => [...prev, { type: "user", text: displayText }]);
    setLoading(true);
    const currentFile = fileBase64, currentFileType = fileType;
    clearFile();
    try {
      const result = await callAgent({
        userQuery: userQuery || "Analyse my receipt and recommend complementary products.",
        memory, fileBase64: currentFile, fileType: currentFileType,
      });
      if (result.memory_update) setMemory((prev) => [...prev, result.memory_update]);
      setMessages((prev) => [...prev, { type: "agent", reasoning: result.reasoning, products: result.products }]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); }
  }

  const canSend = !loading && (!!query.trim() || !!fileBase64);
  const hasMessages = messages.length > 0;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f6f6f3; }
        textarea:focus { outline: none; }
        .suggestion:hover { background: #f0efe9 !important; }
        .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .send-btn:hover:not(:disabled) { background: #111 !important; }
        .link:hover { text-decoration: underline; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.25s ease; }
      `}</style>

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "36px 20px 140px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14, color: "#1a1a1a", lineHeight: 1.6 }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>ShopAgent</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 1 }}>Your AI shopping assistant</div>
          </div>
          {memory.length > 0 && (
            <div style={{ fontSize: 12, color: "#777", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 20, padding: "4px 12px" }}>
              {memory.length} preference{memory.length > 1 ? "s" : ""} saved
            </div>
          )}
        </div>

        {/* Welcome */}
        {!hasMessages && (
          <div className="fade-up">
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>What are you looking for?</div>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>Pick a suggestion or type your own below.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion" onClick={() => handleSearch(s)} style={{
                  textAlign: "left", padding: "11px 14px",
                  background: "#fff", border: "1px solid #e8e8e8",
                  borderRadius: 10, cursor: "pointer",
                  fontSize: 13, color: "#333",
                  transition: "background 0.15s",
                }}>{s}</button>
              ))}
              <label className="suggestion" style={{
                display: "block", textAlign: "left", padding: "11px 14px",
                background: "#fff", border: "1px solid #e8e8e8",
                borderRadius: 10, cursor: "pointer",
                fontSize: 13, color: "#333",
                transition: "background 0.15s",
              }}>
                📎 Upload a receipt for recommendations
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            </div>
          </div>
        )}

        {/* Messages */}
        <div>
          {messages.map((msg, i) => (
            <div key={i} className="fade-up" style={{ marginBottom: 28 }}>

              {msg.type === "user" && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "#1a1a1a", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "10px 16px", maxWidth: "75%", fontSize: 13 }}>
                    {msg.text}
                  </div>
                </div>
              )}

              {msg.type === "agent" && (
                <div>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 14, paddingLeft: 2, fontStyle: "italic" }}>
                    {msg.reasoning}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {msg.products?.map((p, j) => <ProductCard key={j} product={p} />)}
                  </div>
                </div>
              )}

            </div>
          ))}

          {loading && (
            <div style={{ fontSize: 13, color: "#999", padding: "8px 0" }}>
              <span style={{ display: "inline-flex", gap: 4 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#bbb", display: "inline-block", animation: `fadeUp 0.8s ${i*0.15}s ease-in-out infinite alternate` }} />
                ))}
              </span>
            </div>
          )}
          {error && <div style={{ fontSize: 13, color: "#c44", marginTop: 8 }}>{error}</div>}
          {memory.length > 0 && hasMessages && !loading && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>✓ Remembered: {memory[memory.length - 1]}</div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Fixed input */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(246,246,243,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid #e8e8e8", padding: "14px 20px 18px" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          {fileBase64 && (
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{fileType === "application/pdf" ? "📄" : "🖼️"} {fileName}</span>
              <button onClick={clearFile} style={{ fontSize: 11, color: "#c44", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button onClick={() => fileInputRef.current?.click()} style={{
              width: 40, height: 40, borderRadius: 10, border: "1px solid #e0e0e0",
              background: fileBase64 ? "#f0efe9" : "#fff",
              cursor: "pointer", fontSize: 17, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              📎
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: "none" }} />
            </button>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={fileBase64 ? "Add a note or press Enter…" : "Describe what you're looking for…"}
              rows={2}
              style={{
                flex: 1, padding: "10px 14px",
                border: "1px solid #e0e0e0", borderRadius: 10,
                fontSize: 13, resize: "none",
                fontFamily: "inherit", lineHeight: 1.5,
                background: "#fff",
              }}
            />
            <button className="send-btn" onClick={() => handleSearch()} disabled={!canSend} style={{
              height: 40, padding: "0 20px", borderRadius: 10, border: "none",
              background: canSend ? "#1a1a1a" : "#e0e0e0",
              color: canSend ? "#fff" : "#aaa",
              fontSize: 13, fontWeight: 600,
              cursor: canSend ? "pointer" : "not-allowed",
              transition: "background 0.15s", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {loading ? "…" : "Find →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ProductCard({ product }) {
  const [open, setOpen] = useState(false);
  const score = product.match_score;
  const scoreColor = score >= 85 ? "#2a7a4b" : score >= 70 ? "#b07a10" : "#c44";

  return (
    <div className="card" style={{
      background: "#fff", border: "1px solid #e8e8e8",
      borderRadius: 12, padding: "14px 16px",
      transition: "box-shadow 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{product.brand}</div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{product.name}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{product.price}</div>
          <div style={{ fontSize: 11, color: scoreColor, marginTop: 2 }}>{score}% match</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "#666", marginTop: 10, lineHeight: 1.55 }}>{product.why}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
        <a href={product.link} target="_blank" rel="noopener noreferrer" className="link"
          style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500, textDecoration: "none" }}>
          Search this →
        </a>
        <button onClick={() => setOpen(v => !v)} style={{
          fontSize: 12, color: "#aaa", background: "none",
          border: "none", cursor: "pointer", padding: 0,
        }}>
          {open ? "Hide details" : "Show details"}
        </button>
      </div>

      {open && (product.pros?.length > 0 || product.cons?.length > 0) && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0", fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          {product.pros?.map((p, i) => <div key={i} style={{ color: "#2a7a4b" }}>+ {p}</div>)}
          {product.cons?.map((c, i) => <div key={i} style={{ color: "#c44" }}>− {c}</div>)}
        </div>
      )}
    </div>
  );
}