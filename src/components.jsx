import { useState } from "react";

// ─── Animated thinking dots ─────────────────────────────────────────────────
export function ThinkingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#a78bfa",
            animation: "bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Match score bar ────────────────────────────────────────────────────────
export function MatchBar({ score }) {
  const color =
    score >= 85 ? "#34d399" : score >= 70 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#94a3b8",
          marginBottom: 4,
        }}
      >
        <span>Preference match</span>
        <span style={{ color, fontWeight: 600 }}>{score}%</span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: color,
            borderRadius: 2,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Single product card ────────────────────────────────────────────────────
export function ProductCard({ product, index }) {
  const [showPros, setShowPros] = useState(false);

  return (
    <div
      className="product-card"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        padding: "16px 18px",
        animation: "slideIn 0.45s ease both",
        animationDelay: `${index * 0.1}s`,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Brand + price row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            color: "#a78bfa",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {product.brand}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399", whiteSpace: "nowrap" }}>
          {product.price}
        </span>
      </div>

      {/* Product name */}
      <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.35, marginTop: 4 }}>
        {product.name}
      </div>

      <MatchBar score={product.match_score} />

      {/* Why it fits */}
      <p style={{ fontSize: 13, color: "#94a3b8", margin: "10px 0 0", lineHeight: 1.55 }}>
        {product.why}
      </p>

      {/* Pros / cons toggle */}
      <button
        onClick={() => setShowPros(!showPros)}
        style={{
          marginTop: 10,
          fontSize: 12,
          color: "#64748b",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
          textDecoration: "underline",
        }}
      >
        {showPros ? "Hide details ▲" : "Show details ▼"}
      </button>

      {showPros && (
        <div style={{ marginTop: 8 }}>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {product.pros?.map((p, i) => (
              <li key={i} style={{ fontSize: 12, color: "#86efac", marginBottom: 3 }}>
                {p}
              </li>
            ))}
          </ul>
          {product.cons?.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
              {product.cons.map((c, i) => (
                <li key={i} style={{ fontSize: 12, color: "#fca5a5", marginBottom: 3 }}>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Link button */}
      <a
        href={product.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 14,
          padding: "8px 14px",
          borderRadius: 8,
          background: "rgba(167,139,250,0.12)",
          border: "1px solid rgba(167,139,250,0.28)",
          color: "#c4b5fd",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
          transition: "background 0.2s",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(167,139,250,0.25)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(167,139,250,0.12)")}
      >
        🔗 Search this product
      </a>
    </div>
  );
}

// ─── Memory sidebar pill ────────────────────────────────────────────────────
export function MemoryPill({ count }) {
  if (count === 0) return null;
  return (
    <div
      style={{
        marginLeft: "auto",
        fontSize: 11,
        color: "#a78bfa",
        background: "rgba(124,58,237,0.12)",
        border: "1px solid rgba(124,58,237,0.22)",
        borderRadius: 20,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {count} preference{count > 1 ? "s" : ""} remembered
    </div>
  );
}
