"use client";

import { useMemo, useEffect } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Trophy, Loader2 } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";

const NC_CLAIMED_KEY = (addr: string) => `nc_claimed_${CONTRACT_ADDRESS}_${addr}`;
import { COUNTRIES, getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

const CONFETTI_COLORS = [
  "#00ff88", "#7c3aed", "#fbbf24", "#ef4444",
  "#3b82f6", "#f97316", "#ec4899", "#06b6d4",
];

interface Props {
  winningCountryId: number;
  onClose: () => void;
  onClaimed: () => void;
}

export function NationsCupWinnerModal({ winningCountryId, onClose, onClaimed }: Props) {
  const { address, isConnected } = useAccount();
  const { t } = useLang();

  const winner = COUNTRIES.find(c => c.id === winningCountryId);

  const { data: userBalance } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "balanceOf",
    args: address ? [address, BigInt(winningCountryId)] : undefined,
    query: { enabled: !!address },
  });
  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "countryTotalSupply",
    args: [BigInt(winningCountryId)],
  });
  const { data: finalPool } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalNationsCupPool",
  });

  const userBal  = Number(userBalance ?? 0n);
  const supply   = Number(totalSupply ?? 0n);
  const pool     = Number(finalPool ?? 0n);
  const claimable = supply > 0 && userBal > 0
    ? (pool * 0.95 / supply * userBal) / 1e18
    : 0;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (isSuccess && address) {
      localStorage.setItem(NC_CLAIMED_KEY(address.toLowerCase()), "true");
      onClaimed();
    }
  }, [isSuccess, address, onClaimed]);

  const pieces = useMemo(() =>
    Array.from({ length: 90 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(Math.random() * 100).toFixed(1)}%`,
      delay: `${(Math.random() * 1.5).toFixed(2)}s`,
      duration: `${(2 + Math.random() * 1.5).toFixed(2)}s`,
      size: `${6 + Math.floor(Math.random() * 8)}px`,
      borderRadius: Math.random() > 0.55 ? "50%" : "2px",
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  if (!winner) return null;

  const canClaim = isConnected && userBal > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,16,0.93)", backdropFilter: "blur(10px)" }}
    >
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {pieces.map(p => (
          <div key={p.id} style={{
            position: "absolute", top: "-20px", left: p.left,
            width: p.size, height: p.size, background: p.color,
            borderRadius: p.borderRadius,
            animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          }} />
        ))}
      </div>

      {/* Card */}
      <div
        className="glass-card relative w-full max-w-lg overflow-y-auto scrollbar-hide"
        style={{
          maxHeight: "92vh",
          padding: "32px 24px 28px",
          borderColor: "rgba(251,191,36,0.45)",
          boxShadow: "0 0 80px rgba(251,191,36,0.18), 0 0 160px rgba(251,191,36,0.05)",
          animation: "modalPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🏆</div>
          <h2 className="text-2xl font-black text-white">{t.ncw_title}</h2>
          <p className="text-sm mt-1" style={{ color: "#6b7a9a" }}>{t.ncw_sub}</p>
        </div>

        {/* Winner big card */}
        <div
          className="flex items-center gap-4 p-5 rounded-2xl mb-5"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "2px solid rgba(251,191,36,0.5)",
            boxShadow: "0 0 30px rgba(251,191,36,0.15)",
          }}
        >
          <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0">
            <Image src={getFlagUrl(winner.flagCode, 160)} alt={winner.name} fill className="object-cover" unoptimized />
          </div>
          <div className="flex-1">
            <p className="font-black text-white text-2xl">{winner.name}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "#fbbf24" }}>
              {t.ncw_champion} · Group {winner.group}
            </p>
          </div>
          <Trophy size={36} style={{ color: "#fbbf24", flexShrink: 0 }} />
        </div>

        {/* User claim info */}
        {canClaim && (
          <div className="p-4 rounded-2xl mb-5"
            style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.3)" }}>
            <p className="font-bold text-white mb-3">{t.ncw_you_win}</p>
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between">
                <span style={{ color: "#6b7a9a" }}>{t.ncw_your_nfts}</span>
                <span className="font-bold text-white">{userBal} × {winner.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#6b7a9a" }}>{t.ncw_your_reward}</span>
                <span className="font-black font-mono" style={{ color: "#00ff88" }}>~{claimable.toFixed(5)} ETH</span>
              </div>
            </div>
            <button
              onClick={() => writeContract({
                address: CONTRACT_ADDRESS, abi: ABI,
                functionName: "claimNationsCupRewards", args: [],
              })}
              disabled={isPending || isConfirming || isSuccess}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
              style={{
                background: isSuccess ? "rgba(0,255,136,0.15)" : "linear-gradient(135deg,#00ff88,#00cc6a)",
                color: isSuccess ? "#00ff88" : "#050810",
                border: isSuccess ? "1px solid rgba(0,255,136,0.3)" : "none",
                cursor: isPending || isConfirming || isSuccess ? "not-allowed" : "pointer",
              }}
            >
              {(isPending || isConfirming) && <Loader2 size={16} className="animate-spin" />}
              {isSuccess ? t.ncw_claimed : (isPending || isConfirming) ? t.ncw_confirming : t.ncw_claim_btn}
            </button>
          </div>
        )}

        {!isConnected && (
          <div className="p-4 rounded-2xl mb-5 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.ncw_connect}</p>
          </div>
        )}

        {isConnected && userBal === 0 && (
          <div className="p-4 rounded-2xl mb-5 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.ncw_no_nfts}</p>
          </div>
        )}

        {/* All 48 countries grid */}
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: "#6b7a9a" }}>
            {t.ncw_all_countries}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
            {COUNTRIES.map(c => {
              const isWin = c.id === winningCountryId;
              return (
                <div
                  key={c.id}
                  title={c.name}
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    aspectRatio: "4/3",
                    border: isWin ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.06)",
                    filter: isWin ? "none" : "grayscale(100%)",
                    opacity: isWin ? 1 : 0.28,
                    boxShadow: isWin ? "0 0 12px rgba(251,191,36,0.5)" : "none",
                    transition: "opacity 0.2s",
                  }}
                >
                  <Image src={getFlagUrl(c.flagCode, 80)} alt={c.name} fill className="object-cover" unoptimized />
                </div>
              );
            })}
          </div>
        </div>

        {/* Close */}
        <button
          onClick={() => {
            // Non-winners can't claim → mark as dismissed so modal doesn't reappear every refresh
            if (!canClaim && address) {
              localStorage.setItem(NC_CLAIMED_KEY(address.toLowerCase()), "true");
            }
            onClose();
          }}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b7a9a", cursor: "pointer" }}
        >
          {canClaim ? t.ncw_close_later : t.ncw_close}
        </button>
      </div>
    </div>
  );
}
