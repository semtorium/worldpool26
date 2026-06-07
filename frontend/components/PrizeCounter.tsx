"use client";

import { useReadContract } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { useLang } from "@/lib/LanguageContext";
import { useEthUsd } from "@/lib/useEthUsd";

interface PrizeCounterProps {
  activeTab?: string;
}

export function PrizeCounter({ activeTab }: PrizeCounterProps) {
  const { t } = useLang();
  const ethUsd = useEthUsd();
  const isScorer = activeTab === "scorer";
  const isHidden = activeTab === "leaderboard" || activeTab === "activity" || activeTab === "groups";

  const { data: ncPool } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "nationsCupPoolBalance",
    query: { refetchInterval: 5_000 },
  });

  const { data: tsPool } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "topScorerPoolBalance",
    query: { refetchInterval: 5_000 },
  });

  if (isHidden) return null;

  const pool     = isScorer ? (tsPool ?? 0n) : (ncPool ?? 0n);
  const ethValue = Number(pool) / 1e18;
  const eth      = ethValue.toFixed(4);
  const [int, dec] = eth.split(".");
  const usd      = ethUsd !== null ? ethValue * ethUsd : null;

  const accent    = isScorer ? "#8b5cf6" : "#fbbf24";
  const accentRgb = isScorer ? "139,92,246" : "251,191,36";
  const label     = isScorer ? t.ts_pool : t.prize_label;
  const subtitle  = isScorer
    ? "Grows with every ticket"
    : "Grows with every mint · Claim when your nation wins";

  return (
    <div
      className="prize-hero-wrap"
      style={{ position: "relative", padding: "36px 16px 28px", textAlign: "center", overflow: "hidden" }}
    >
      {/* Background glows */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 120% at 50% 0%, rgba(${accentRgb},0.10) 0%, transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 80% at 50% 100%, rgba(0,255,136,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Animated ring */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(480px,90vw)", height: "min(480px,90vw)", borderRadius: "50%", border: `1px solid rgba(${accentRgb},0.06)`, animation: "prizeRingPulse 4s ease-in-out infinite", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Label */}
        <div
          className="inline-flex items-center gap-3 mb-6"
          style={{
            background: `rgba(${accentRgb},0.08)`,
            border: `1px solid rgba(${accentRgb},0.2)`,
            borderRadius: "99px",
            padding: "6px 21px",
          }}
        >
          <div className="live-dot" style={{ width: 7, height: 7, minWidth: 7 }} />
          <span className="font-black tracking-[0.25em] uppercase" style={{ color: accent, fontSize: "15px" }}>
            {label}
          </span>
        </div>

        {/* Big number */}
        <div className="flex items-baseline justify-center" style={{ gap: "2px", lineHeight: 1 }}>
          <span className="font-black font-mono" style={{ fontSize: "clamp(3.5rem,12vw,7.5rem)", color: "#fff", textShadow: `0 0 60px rgba(${accentRgb},0.25), 0 0 120px rgba(${accentRgb},0.10)`, letterSpacing: "-0.03em" }}>
            {int}
          </span>
          <span className="font-black font-mono" style={{ fontSize: "clamp(3rem,10vw,6.5rem)", color: accent, textShadow: `0 0 40px rgba(${accentRgb},0.5)`, letterSpacing: "-0.03em" }}>
            .{dec}
          </span>
          <span className="font-black" style={{ fontSize: "clamp(1.2rem,4vw,2.5rem)", color: `rgba(${accentRgb},0.6)`, marginLeft: "8px", letterSpacing: "0.05em" }}>
            ETH
          </span>
        </div>

        {/* USD equivalent */}
        {usd !== null && (
          <p className="mt-1 font-mono" style={{ fontSize: "clamp(0.7rem,2vw,0.95rem)", color: `rgba(${accentRgb},0.38)` }}>
            est. dollar value ≈ ${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        )}

        {/* Subtitle */}
        <p className="mt-3 text-sm font-semibold" style={{ color: "rgba(107,122,154,0.9)" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
