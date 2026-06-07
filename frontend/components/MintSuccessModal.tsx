"use client";

import { useMemo, useEffect } from "react";
import Image from "next/image";
import { X, ExternalLink } from "lucide-react";
import { getFlagUrl, type Country } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

interface Props {
  country: Country;
  amount: number;
  txHash: string;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  "#00ff88", "#7c3aed", "#fbbf24", "#ef4444",
  "#3b82f6", "#f97316", "#ec4899", "#06b6d4",
];

const EXPLORER = "https://sepolia.basescan.org/tx/";

export function MintSuccessModal({ country, amount, txHash, onClose }: Props) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const shortHash = `${txHash.slice(0, 10)}…${txHash.slice(-8)}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Confetti */}
      <div className="fixed inset-0 z-[201] pointer-events-none overflow-hidden">
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
          borderColor: "rgba(0,255,136,0.3)",
          boxShadow: "0 0 60px rgba(0,255,136,0.15), 0 0 120px rgba(0,255,136,0.05)",
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
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-black text-white">{t.modal_congrats}</h2>
          <p className="text-sm mt-1" style={{ color: "#6b7a9a" }}>{t.modal_success}</p>
        </div>

        {/* Country */}
        <div
          className="flex items-center gap-4 p-4 rounded-2xl mb-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="relative w-16 h-12 rounded-xl overflow-hidden shrink-0">
            <Image src={getFlagUrl(country.flagCode, 160)} alt={country.name} fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-white text-lg leading-tight">{country.name}</p>
            <p className="text-sm mt-0.5 font-semibold" style={{ color: "#00ff88" }}>
              {amount} {t.modal_nft_count}
            </p>
          </div>
          <div className="text-2xl font-black font-mono shrink-0" style={{ color: "#fbbf24" }}>
            ×{amount}
          </div>
        </div>

        {/* Details */}
        <div
          className="space-y-2.5 text-sm p-3 rounded-xl mb-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex justify-between items-center">
            <span style={{ color: "#6b7a9a" }}>{t.modal_token_id}</span>
            <span className="font-mono font-bold text-white">#{country.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: "#6b7a9a" }}>{t.modal_country_label}</span>
            <span className="font-bold text-white">{country.name} · {country.group}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: "#6b7a9a" }}>{t.modal_tx_label}</span>
            <span className="font-mono text-xs text-white">{shortHash}</span>
          </div>
        </div>

        {/* Explorer */}
        <a
          href={`${EXPLORER}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold mb-3 transition-colors"
          style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88" }}
        >
          <ExternalLink size={15} />
          {t.modal_explorer_btn}
        </a>

        <button onClick={onClose} className="btn-neon w-full text-sm py-3">
          {t.modal_close_btn}
        </button>
      </div>
    </div>
  );
}
