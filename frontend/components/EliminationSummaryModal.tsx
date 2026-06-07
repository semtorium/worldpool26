"use client";

import { useEffect } from "react";
import Image from "next/image";
import { COUNTRIES, getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

interface Props {
  newlyEliminatedIds: number[];
  onClose: () => void;
}

export function EliminationSummaryModal({ newlyEliminatedIds, onClose }: Props) {
  const { t } = useLang();

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const eliminated = newlyEliminatedIds
    .map(id => COUNTRIES.find(c => c.id === id))
    .filter(Boolean) as typeof COUNTRIES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,16,0.93)", backdropFilter: "blur(10px)" }}
    >
      {/* Card */}
      <div
        className="glass-card relative w-full max-w-md overflow-y-auto scrollbar-hide"
        style={{
          maxHeight: "88vh",
          padding: "32px 24px 24px",
          borderColor: "rgba(239,68,68,0.4)",
          boxShadow: "0 0 60px rgba(239,68,68,0.12)",
          animation: "modalPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⛔</div>
          <h2 className="text-xl font-black text-white">{t.elim_title}</h2>
          <p className="text-sm mt-1 font-semibold" style={{ color: "#ff6060" }}>
            {eliminated.length} {t.elim_new}
          </p>
        </div>

        {/* Eliminated country list */}
        <div className="space-y-2 mb-6">
          {eliminated.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div className="relative w-10 h-7 rounded-lg overflow-hidden shrink-0"
                style={{ filter: "grayscale(60%)", opacity: 0.8 }}>
                <Image
                  src={getFlagUrl(c.flagCode, 80)}
                  alt={c.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span className="font-bold text-white text-sm flex-1">{c.name}</span>
              <span className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ff6060", border: "1px solid rgba(239,68,68,0.25)" }}>
                {t.card_eliminated}
              </span>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-black"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ff6060",
            cursor: "pointer",
          }}
        >
          {t.elim_close}
        </button>
      </div>
    </div>
  );
}
