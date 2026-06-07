"use client";

import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/LanguageContext";
import { LANGUAGES } from "@/lib/i18n";
import { ChevronDown } from "lucide-react";

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === lang)!;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* translate="no" prevents Chrome/browser auto-translate from changing language labels */}
      <button
        onClick={() => setOpen(o => !o)}
        translate="no"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f0f4ff" }}>
        <span translate="no">{current.label}</span>
        <ChevronDown size={14} style={{ color: "#6b7a9a", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 py-1 rounded-2xl shadow-2xl z-50 min-w-[150px]"
          style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              translate="no"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left"
              style={{
                color: lang === l.code ? "#00ff88" : "#f0f4ff",
                background: lang === l.code ? "rgba(0,255,136,0.08)" : "transparent",
              }}
              onMouseEnter={e => { if (lang !== l.code) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (lang !== l.code) e.currentTarget.style.background = "transparent"; }}>
              <span translate="no">{l.label}</span>
              {lang === l.code && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
