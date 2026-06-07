"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Copy, Check } from "lucide-react";
import type { TxErrorInfo } from "@/lib/parseError";
import { useLang } from "@/lib/LanguageContext";

interface Props {
  info: TxErrorInfo;
  onClose: () => void;
}

export function TxErrorModal({ info, onClose }: Props) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCopy = () => {
    const text = [
      `Title:  ${t[info.titleKey]}`,
      `Detail: ${info.detail}`,
      `Code:   ${info.code}`,
    ].join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(6,9,20,0.82)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: "#0d1117",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: 20,
          boxShadow: "0 0 60px rgba(239,68,68,0.12), 0 24px 80px rgba(0,0,0,0.6)",
          animation: "modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top red stripe */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #ef4444, #f97316)" }} />

        <div style={{ padding: "24px 24px 22px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            {/* Icon */}
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={22} style={{ color: "#ef4444" }} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }}>
                {t[info.titleKey]}
              </p>
              <p style={{ fontSize: 13, color: "#ef4444", marginTop: 5, fontWeight: 600, lineHeight: 1.4, wordBreak: "break-word" }}>
                {info.detail}
              </p>
            </div>

            {/* Close X */}
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#6b7a9a",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Error code box */}
          {info.code && (
            <div style={{
              borderRadius: 10,
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.18)",
              padding: "10px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              marginBottom: 16,
            }}>
              <code style={{
                fontSize: 11, fontFamily: "monospace",
                color: "rgba(239,68,68,0.75)",
                wordBreak: "break-all", flex: 1,
                lineHeight: 1.5,
              }}>
                {info.code}
              </code>
              <button
                onClick={handleCopy}
                title="Copy error code"
                style={{
                  background: "transparent", border: "none",
                  color: copied ? "#22c55e" : "#6b7a9a",
                  cursor: "pointer", flexShrink: 0, padding: "2px",
                  transition: "color 0.2s",
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: "100%",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 12,
              color: "#ef4444",
              fontWeight: 700,
              fontSize: 13,
              padding: "11px",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
          >
            {t.err_close}
          </button>
        </div>
      </div>
    </div>
  );
}
