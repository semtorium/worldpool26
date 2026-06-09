"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, User, X } from "lucide-react";
import { useBasename } from "@/lib/useBasename";
import { useUsername } from "@/lib/useUsername";

interface Props {
  address: `0x${string}`;
  onDone: () => void;
}

export function UsernameModal({ address, onDone }: Props) {
  const { name: basename, loading: bnLoading } = useBasename(address);
  const { applyUsername, isTaken }             = useUsername(address);

  const [input, setInput]     = useState("");
  const [error, setError]     = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  // Auto-fill from Basename/ENS when resolved
  useEffect(() => {
    if (basename && !prefilled) {
      setInput(basename);
      setPrefilled(true);
    }
  }, [basename, prefilled]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleApply = () => {
    const trimmed = input.trim();
    if (!trimmed) { onDone(); return; } // empty = same as skip
    if (isTaken(trimmed)) {
      setError("This username is already taken by another wallet.");
      return;
    }
    applyUsername(trimmed);
    onDone();
  };

  const handleSkip = () => {
    applyUsername(""); // explicitly clear so we don't re-prompt
    onDone();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleApply();
    if (e.key === "Escape") handleSkip();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) handleSkip(); }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5 relative"
        style={{
          background: "linear-gradient(160deg,#0a0f24 0%,#070c1d 100%)",
          border: "1px solid rgba(0,82,255,0.25)",
          boxShadow: "0 0 60px rgba(0,82,255,0.12), 0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: "#6b7a9a" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6b7a9a")}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg,rgba(0,82,255,0.25),rgba(37,99,235,0.15))",
              border: "1px solid rgba(0,82,255,0.3)",
            }}
          >
            <User size={18} style={{ color: "#60A5FA" }} />
          </div>
          <div>
            <h2 className="font-black text-white text-base leading-tight">Set a Username</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a9a" }}>
              Shown instead of your wallet address
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl relative"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
              transition: "border-color 0.15s",
            }}
          >
            {bnLoading && (
              <Loader2 size={14} className="animate-spin shrink-0" style={{ color: "#6b7a9a" }} />
            )}
            <input
              ref={inputRef}
              type="text"
              maxLength={32}
              value={input}
              onChange={e => { setInput(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="(Optional)"
              className="flex-1 bg-transparent border-none outline-none text-white font-semibold text-sm placeholder:text-[#3d4a63]"
            />
            {input && (
              <button
                onClick={() => { setInput(""); setError(""); inputRef.current?.focus(); }}
                className="shrink-0 text-xs font-bold"
                style={{ color: "#6b7a9a" }}
              >✕</button>
            )}
          </div>

          {/* Taken error */}
          {error && (
            <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>
              ⚠ {error}
            </p>
          )}

          {/* Basename hint */}
          {basename && !bnLoading && (
            <p className="text-xs" style={{ color: "rgba(96,165,250,0.7)" }}>
              ✦ Basename detected: <span className="font-bold text-blue-400">{basename}</span>
            </p>
          )}

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            Max 32 characters · stored locally on this device
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#6b7a9a",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
          >
            Skip
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
            style={{
              background: input.trim()
                ? "linear-gradient(135deg,#0052FF,#2563EB)"
                : "rgba(0,82,255,0.15)",
              border: "1px solid rgba(0,82,255,0.4)",
              color: input.trim() ? "#fff" : "rgba(255,255,255,0.3)",
              boxShadow: input.trim() ? "0 0 20px rgba(0,82,255,0.25)" : "none",
              transition: "all 0.15s",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
