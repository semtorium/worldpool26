"use client";

import { useMemo, useEffect } from "react";
import Image from "next/image";
import { X, Zap } from "lucide-react";
import { getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

interface Player {
  name: string;
  country: string;
  flag: string;
  votes: number;
}

interface Props {
  ticketsBought: number;
  unusedTotal: number;
  top5: Player[];
  onClose: () => void;
  onVoteNow: () => void;
}

const CONFETTI_COLORS = [
  "#8b5cf6", "#7c3aed", "#fbbf24", "#00ff88",
  "#3b82f6", "#f97316", "#ec4899", "#06b6d4",
];

export function TicketSuccessModal({ ticketsBought, unusedTotal, top5, onClose, onVoteNow }: Props) {
  const { t } = useLang();
  const pieces = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(Math.random() * 100).toFixed(1)}%`,
      delay: `${(Math.random() * 1.2).toFixed(2)}s`,
      duration: `${(1.8 + Math.random() * 1.4).toFixed(2)}s`,
      size: `${6 + Math.floor(Math.random() * 8)}px`,
      borderRadius: Math.random() > 0.55 ? "50%" : "2px",
    })),
  []);

  useEffect(() => {
    // Lock body scroll
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {pieces.map(p => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              top: "-20px",
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.borderRadius,
              animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="glass-card relative w-full max-w-sm overflow-hidden"
        style={{
          padding: "32px 28px 28px",
          borderColor: "rgba(139,92,246,0.4)",
          boxShadow: "0 0 60px rgba(139,92,246,0.2), 0 0 120px rgba(139,92,246,0.08)",
          animation: "modalPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg"
          style={{ color: "#6b7a9a" }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎟️</div>
          <h2 className="text-2xl font-black text-white">{t.tsm_title}</h2>
          <p className="text-sm mt-1" style={{ color: "#6b7a9a" }}>{t.tsm_sub}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <p className="text-2xl font-black text-white">+{ticketsBought}</p>
            <p className="text-xs mt-0.5 font-semibold" style={{ color: "#8b5cf6" }}>{t.tsm_tickets_bought}</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)" }}
          >
            <p className="text-2xl font-black text-white">{unusedTotal}</p>
            <p className="text-xs mt-0.5 font-semibold" style={{ color: "#00ff88" }}>{t.tsm_votes_ready}</p>
          </div>
        </div>

        {/* Top 5 */}
        {top5.length > 0 && (
          <div className="mb-5">
            <p
              className="text-xs font-black tracking-widest uppercase mb-2"
              style={{ color: "#6b7a9a" }}
            >
              🔥 {t.tsm_top_faves}
            </p>
            <div className="space-y-1.5">
              {top5.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span
                    className="text-xs font-black w-4 shrink-0"
                    style={{ color: i === 0 ? "#fbbf24" : "#6b7a9a" }}
                  >
                    #{i + 1}
                  </span>
                  <Image
                    src={getFlagUrl(p.flag, 80)}
                    alt={p.country}
                    width={20}
                    height={15}
                    className="rounded shrink-0 object-cover"
                    unoptimized
                  />
                  <span className="text-xs font-bold text-white flex-1 truncate">{p.name}</span>
                  <span
                    className="text-xs font-mono font-bold shrink-0"
                    style={{ color: "#8b5cf6" }}
                  >
                    {p.votes.toLocaleString()}v
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vote Now */}
        <button
          onClick={() => { onClose(); onVoteNow(); }}
          className="btn-neon w-full text-sm py-3 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#7c3aed,#8b5cf6)" }}
        >
          <Zap size={16} />
          {t.tsm_vote_now}
        </button>
      </div>
    </div>
  );
}
