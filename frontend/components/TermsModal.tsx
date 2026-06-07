"use client";

import { useState } from "react";

interface Props {
  onAccept: () => void;
}

export function TermsModal({ onAccept }: Props) {
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    if (!checked) return;
    localStorage.setItem("tos_accepted", "true");
    onAccept();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "rgba(6,9,20,0.88)",
      backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
      animation: "tosBackdropIn 0.3s ease",
    }}>
      <div style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24,
        width: "100%",
        maxWidth: 480,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,82,255,0.08)",
        animation: "tosModalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        overflow: "hidden",
      }}>

        {/* Top accent bar */}
        <div style={{
          height: 3,
          background: "linear-gradient(90deg, #0052FF, #2563EB)",
        }} />

        <div style={{ padding: "28px 28px 24px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              📋
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: "#fff", margin: 0 }}>
                Terms of Use
              </h2>
              <p style={{ fontSize: 12, color: "#6b7a9a", margin: 0, marginTop: 2 }}>
                Please read before continuing
              </p>
            </div>
          </div>

          {/* Summary box */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: "16px",
            marginBottom: 20,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {[
              { icon: "🎮", text: "WorldPool26 is an entertainment & prediction platform, not a gambling or financial product." },
              { icon: "⛓️", text: "All transactions are on-chain and irreversible. You are responsible for your wallet and funds." },
              { icon: "🏆", text: "NFTs are digital collectibles. Prize pools are distributed by smart contract based on World Cup results." },
              { icon: "🔞", text: "You must be 18+ years of age and not a US resident to use this platform." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <p style={{ fontSize: 12.5, color: "#b0bcd4", lineHeight: 1.6, margin: 0 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Read full link */}
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 20, textAlign: "center" }}>
            Want to read the full document?{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0052FF", fontWeight: 700, textDecoration: "none" }}
            >
              View Terms of Use →
            </a>
          </p>

          {/* Checkbox */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            cursor: "pointer", marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 12,
            background: checked ? "rgba(0,82,255,0.05)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${checked ? "rgba(0,82,255,0.25)" : "rgba(255,255,255,0.07)"}`,
            transition: "all 0.2s",
          }}>
            {/* Custom checkbox */}
            <div
              onClick={() => setChecked(!checked)}
              style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: checked ? "#0052FF" : "transparent",
                border: `2px solid ${checked ? "#0052FF" : "rgba(255,255,255,0.2)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
                cursor: "pointer",
              }}
            >
              {checked && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4 7.5L10 1" stroke="#060914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span
              style={{ fontSize: 13, color: "#d0daf0", lineHeight: 1.55, userSelect: "none" }}
              onClick={() => setChecked(!checked)}
            >
              I confirm that I am 18 years of age or older, I am not a US resident, and I have read and agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: "#0052FF", fontWeight: 700, textDecoration: "none" }}
              >
                Terms of Use
              </a>.
            </span>
          </label>

          {/* Agree button */}
          <button
            onClick={handleAccept}
            disabled={!checked}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 14,
              border: "none",
              cursor: checked ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 800,
              transition: "all 0.2s",
              background: checked
                ? "linear-gradient(135deg, #0052FF, #00cc6a)"
                : "rgba(255,255,255,0.05)",
              color: checked ? "#060914" : "#4a5568",
              boxShadow: checked ? "0 0 24px rgba(0,82,255,0.3)" : "none",
              transform: checked ? "translateY(0)" : "none",
            }}
          >
            {checked ? "Enter WorldPool26 →" : "Check the box above to continue"}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes tosBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tosModalIn {
          from { transform: scale(0.88) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0);       opacity: 1; }
        }
      `}</style>
    </div>
  );
}
