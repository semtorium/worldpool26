"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, EARLY_BIRD_SUPPLY } from "@/lib/config";
import { COUNTRIES, getFlagUrl } from "@/lib/countries";
import { CountryCard } from "./CountryCard";
import { MintBarChart } from "./MintBarChart";
import { Loader2, Trophy } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { TxErrorModal } from "./TxErrorModal";
import { parseWriteError } from "@/lib/parseError";

// June 11 2026 16:00 UTC — opening match kick-off
const TOURNAMENT_START = new Date("2026-06-11T16:00:00Z").getTime();

function useCountdown() {
  // null on server / first render to avoid SSR hydration mismatch
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0, TOURNAMENT_START - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (timeLeft === null || timeLeft <= 0) return null;

  const totalSecs = Math.floor(timeLeft / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;
  const lastHour = days === 0 && hours === 0;
  return { days, hours, mins, secs, lastHour };
}

// Dynamic mint deadline countdown — driven by on-chain mintEndTime (ms)
function useMintDeadlineCountdown(deadlineMs: number) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadlineMs) { setTimeLeft(0); return; }
    const tick = () => setTimeLeft(Math.max(0, deadlineMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  // Return "not expired, zeros" until mounted so SSR HTML is stable
  if (timeLeft === null) return { expired: false, days: 0, hours: 0, mins: 0, secs: 0 };

  const expired = deadlineMs > 0 && timeLeft <= 0;
  const totalSecs = Math.floor(timeLeft / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;
  return { expired, days, hours, mins, secs };
}

const FILTERS = ["ALL", "YOURS"] as const;
type Filter = typeof FILTERS[number];

export function NationsCupPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [flashCards, setFlashCards] = useState(false);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown();

  // On-chain mint deadline (admin-configurable via setMintEndTime)
  const { data: mintEndTimeOnChain } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "mintEndTime",
    query: { refetchInterval: 30_000 },
  });
  const mintEndTimeMs = mintEndTimeOnChain ? Number(mintEndTimeOnChain as bigint) * 1000 : 0;
  const mintDeadline = useMintDeadlineCountdown(mintEndTimeMs);
  const { address } = useAccount();
  const { t } = useLang();
  const queryClient = useQueryClient();

  // Scroll to country cards grid (accounting for sticky header) and flash them
  const handleMintNow = () => {
    if (cardsGridRef.current) {
      const headerEl    = document.querySelector("header");
      const headerH     = (headerEl?.offsetHeight ?? 110) + 16; // header + 16px breathing room
      const elTop       = cardsGridRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elTop - headerH, behavior: "smooth" });
    }
    setFlashCards(false);
    setTimeout(() => setFlashCards(true), 50);
    setTimeout(() => setFlashCards(false), 1750);
  };

  const { data: tournamentFinalized, isLoading } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" });
  const { data: winningCountryId }       = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" });
  const { data: eliminationStatus }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllEliminationStatus", query: { refetchInterval: 30_000 } });
  const { data: contractMintClosed }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "mintClosed", query: { refetchInterval: 30_000 } });
  const { data: contractPaused }         = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "paused" });

  // Early-bird global counter
  const { data: totalNFTsMinted } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "totalNFTsMinted",
    query: { refetchInterval: 5_000 },
  });
  const mintedCount    = Number(totalNFTsMinted ?? 0n);
  const ebRemaining    = Math.max(0, EARLY_BIRD_SUPPLY - mintedCount);

  // Mint is "closed" when mintClosed flag set OR emergency paused OR tournament finalized OR on-chain deadline passed
  const mintClosed = !!contractMintClosed || !!contractPaused || !!tournamentFinalized || (mintEndTimeMs > 0 && mintDeadline.expired);
  const showEarlyBird  = !mintClosed && !tournamentFinalized && ebRemaining > 0;
  const { data: userBalance }         = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "balanceOf",
    args: address && winningCountryId ? [address, winningCountryId] : undefined,
    query: { enabled: !!address && !!tournamentFinalized },
  });

  // Fetch all 48 country balances for the YOURS filter
  const { data: allBalances } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "balanceOfBatch",
    args: address
      ? [
          Array(COUNTRIES.length).fill(address),
          COUNTRIES.map(c => BigInt(c.id)),
        ]
      : undefined,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  const { writeContract: claim, data: claimHash, isPending: isClaiming, error: claimError, reset: resetClaim } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess, error: claimReceiptError } = useWaitForTransactionReceipt({ hash: claimHash });
  const claimTxError = claimError ?? claimReceiptError ?? null;

  // Invalidate pool cache after NC claim so PrizeCounter updates instantly
  useEffect(() => {
    if (isClaimSuccess) {
      queryClient.invalidateQueries();
    }
  }, [isClaimSuccess, queryClient]);

  // Build a Set of owned country ids for fast lookup
  const ownedIds = new Set<number>(
    allBalances
      ? COUNTRIES.filter((_, i) => Number(allBalances[i] ?? 0n) > 0).map(c => c.id)
      : []
  );

  const baseList = filter === "YOURS"
    ? COUNTRIES.filter(c => ownedIds.has(c.id))
    : COUNTRIES;

  // When tournament is finalized, all non-winner countries are treated as eliminated
  const isElim = (id: number) => {
    if (!!tournamentFinalized && Number(winningCountryId) !== id) return true;
    return !!(eliminationStatus as boolean[] | undefined)?.[id];
  };

  const filtered = baseList.slice().sort((a, b) => {
    const aElim = isElim(a.id);
    const bElim = isElim(b.id);
    if (aElim !== bElim) return aElim ? 1 : -1; // eliminated → end
    return a.favoriteRank - b.favoriteRank;       // within same group → favoriteRank
  });

  const canClaim  = tournamentFinalized && userBalance && Number(userBalance) > 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Teams card */}
        <div className="glass-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.nc_teams}</p>
          {(() => {
            const elimArr = eliminationStatus as boolean[] | undefined;
            // When tournament finalized: only 1 team (champion) still competing
            if (tournamentFinalized) {
              return <p className="text-2xl font-black font-mono" style={{ color: "#fbbf24" }}>1</p>;
            }
            const elimCount = elimArr ? elimArr.filter(Boolean).length : 0;
            const remaining = 48 - elimCount;
            return (
              <p className="text-2xl font-black font-mono text-white">
                {remaining}
                {elimCount > 0 && (
                  <span className="text-sm font-semibold ml-1" style={{ color: "#6b7a9a" }}>/ 48</span>
                )}
              </p>
            );
          })()}
        </div>

        {/* Countdown / Live card */}
        <div className="glass-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.nc_status}</p>
          {tournamentFinalized ? (
            <div className="flex flex-col items-center gap-1">
              <p className="text-lg font-black text-white leading-tight">{t.nc_finalized}</p>
              {winningCountryId && Number(winningCountryId) > 0 && (() => {
                const winner = COUNTRIES.find(c => c.id === Number(winningCountryId));
                if (!winner) return null;
                return (
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <span className="font-black tracking-[0.22em] uppercase"
                      style={{ fontSize: "9px", color: "rgba(251,191,36,0.55)", letterSpacing: "0.22em" }}>
                      {t.nc_champion_label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Image
                        src={getFlagUrl(winner.flagCode, 80)}
                        alt={winner.name}
                        width={20} height={14}
                        className="rounded object-cover shrink-0"
                        unoptimized
                      />
                      <div style={{ filter: "drop-shadow(0 0 10px rgba(251,191,36,0.6))" }}>
                        <span
                          className="font-black uppercase"
                          style={{
                            fontSize: "15px",
                            background: "linear-gradient(180deg, #fffbe0 0%, #fbbf24 45%, #f59e0b 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            letterSpacing: "0.08em",
                            lineHeight: 1,
                          }}
                        >
                          {winner.name}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : countdown === null ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="live-dot" />
              <span className="text-2xl font-black" style={{ color: "#0052FF" }}>{t.live_label}</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#0052FF" }}>
                {t.nc_starts_in}
              </p>
              <div className="flex items-baseline justify-center gap-0.5 font-mono font-black text-white">
                {countdown.lastHour ? (
                  // last hour: show mm:ss
                  <>
                    <span className="text-xl">{String(countdown.mins).padStart(2, "0")}</span>
                    <span className="text-sm" style={{ color: "#6b7a9a" }}>m</span>
                    <span className="mx-1 text-sm" style={{ color: "#6b7a9a" }}>:</span>
                    <span className="text-xl">{String(countdown.secs).padStart(2, "0")}</span>
                    <span className="text-sm" style={{ color: "#6b7a9a" }}>s</span>
                  </>
                ) : (
                  // normal: d · h · m
                  <>
                    {countdown.days > 0 && (
                      <><span className="text-xl">{countdown.days}</span><span className="text-xs" style={{ color: "#6b7a9a" }}>d</span><span className="mx-1 text-sm" style={{ color: "#6b7a9a" }}>·</span></>
                    )}
                    <span className="text-xl">{String(countdown.hours).padStart(2, "0")}</span>
                    <span className="text-xs" style={{ color: "#6b7a9a" }}>h</span>
                    <span className="mx-1 text-sm" style={{ color: "#6b7a9a" }}>·</span>
                    <span className="text-xl">{String(countdown.mins).padStart(2, "0")}</span>
                    <span className="text-xs" style={{ color: "#6b7a9a" }}>m</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claim TX Error */}
      {claimTxError && (
        <TxErrorModal info={parseWriteError(claimTxError)} onClose={resetClaim} />
      )}

      {/* Claim */}
      {canClaim && (
        <div className="glass-card p-5 flex items-center justify-between gap-4"
          style={{ borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.05)" }}>
          <div className="flex items-center gap-3">
            <Trophy size={24} style={{ color: "#fbbf24" }} />
            <div>
              <p className="font-bold text-white">{t.nc_claim_title}</p>
              <p className="text-sm" style={{ color: "#6b7a9a" }}>
                {userBalance?.toString()} {t.nc_claim_sub}
              </p>
            </div>
          </div>
          <button
            onClick={() => claim({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "claimNationsCupRewards", args: [] })}
            disabled={isClaiming || isClaimConfirming}
            className="btn-neon flex items-center gap-2 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", boxShadow: "0 0 20px rgba(251,191,36,0.3)" }}>
            {(isClaiming || isClaimConfirming) && <Loader2 size={16} className="animate-spin" />}
            {isClaimSuccess ? t.nc_claimed : t.nc_claim_btn}
          </button>
        </div>
      )}

      {/* Combined FOMO + Early Bird mega banner */}
      {!mintClosed && !tournamentFinalized && (showEarlyBird || mintEndTimeMs > 0) && (
        <div style={{
          borderRadius: "18px",
          border: `1px solid ${mintEndTimeMs > 0 ? "rgba(239,68,68,0.6)" : "rgba(251,191,36,0.6)"}`,
          background: "linear-gradient(135deg, rgba(12,16,30,0.93) 0%, rgba(18,10,10,0.91) 100%)",
          backdropFilter: "blur(12px)",
          boxShadow: mintEndTimeMs > 0
            ? "0 0 40px rgba(239,68,68,0.18), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)"
            : "0 0 40px rgba(251,191,36,0.18), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
          padding: "20px 22px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle color tint overlay */}
          <div style={{ position: "absolute", inset: 0, background: mintEndTimeMs > 0 ? "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(251,191,36,0.04) 100%)" : "linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(245,158,11,0.03) 100%)", pointerEvents: "none", borderRadius: "18px" }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", position: "relative" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: mintEndTimeMs > 0 ? "#ef4444" : "#fbbf24", boxShadow: `0 0 10px ${mintEndTimeMs > 0 ? "#ef4444" : "#fbbf24"}`, animation: "liveDotPulse 1s ease-in-out infinite", flexShrink: 0 }} />
            <span className="font-black tracking-[0.22em] uppercase" style={{ fontSize: "11px", color: mintEndTimeMs > 0 ? "#ff6b6b" : "#fbbf24" }}>
              {mintEndTimeMs > 0 ? "MINT WINDOW CLOSING SOON" : `🔥 ${t.eb_title}`}
            </span>
          </div>

          {/* Three steps */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginBottom: "18px", position: "relative" }}>
            {([
              { icon: "🎨", label: "Mint NFT",      sub: "Pick your country" },
              { icon: "🏆", label: "Hold NFT",       sub: "Support your team" },
              { icon: "💰", label: "Win Prize Pool", sub: "Claim your ETH"    },
            ] as const).map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: "82px" }}>
                  <div style={{ fontSize: "26px", marginBottom: "5px", filter: "drop-shadow(0 0 10px rgba(251,191,36,0.55))", animation: i === 0 ? "fomoIconPop 2s ease-in-out infinite" : undefined }}>{step.icon}</div>
                  <span className="font-black" style={{ fontSize: "13px", lineHeight: 1.2, color: "#ffffff" }}>{step.label}</span>
                  <span style={{ fontSize: "10px", color: "rgba(255,220,100,0.75)", marginTop: "2px" }}>{step.sub}</span>
                </div>
                {i < 2 && <span style={{ fontSize: "18px", color: "rgba(251,191,36,0.7)", flexShrink: 0 }}>→</span>}
              </div>
            ))}
          </div>

          {/* Early Bird row */}
          {showEarlyBird && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
              borderTop: "1px solid rgba(251,191,36,0.2)", paddingTop: "14px", marginBottom: "14px", position: "relative",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span className="font-black" style={{ fontSize: "12px", color: "#fbbf24" }}>🔥 {t.eb_title}</span>
                <span style={{ fontSize: "10px", color: "rgba(255,220,100,0.65)" }}>{t.eb_max_tx}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: "10px", padding: "6px 14px", flexShrink: 0 }}>
                <span className="font-black font-mono" style={{ fontSize: "18px", color: "#ffffff" }}>{ebRemaining}</span>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>/ {EARLY_BIRD_SUPPLY} slots</span>
                <span style={{ marginLeft: 6, padding: "2px 8px", borderRadius: 99, background: "rgba(251,191,36,0.22)", border: "1px solid rgba(251,191,36,0.5)", fontSize: 11, fontWeight: 900, color: "#fbbf24" }}>
                  {t.eb_discount}
                </span>
              </div>
            </div>
          )}

          {/* Countdown + CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: mintEndTimeMs > 0 ? "space-between" : "flex-end", gap: "12px", flexWrap: "wrap", position: "relative" }}>
            {mintEndTimeMs > 0 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                {mintDeadline.days > 0 && (
                  <>
                    <div style={{ textAlign: "center" }}>
                      <div className="font-black font-mono" style={{ fontSize: "32px", lineHeight: 1, color: "#ffffff" }}>{mintDeadline.days}</div>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", marginTop: "2px" }}>DAYS</div>
                    </div>
                    <span style={{ fontSize: "24px", color: "rgba(251,191,36,0.5)", paddingBottom: "14px", alignSelf: "flex-end" }}>:</span>
                  </>
                )}
                <div style={{ textAlign: "center" }}>
                  <div className="font-black font-mono" style={{ fontSize: "32px", lineHeight: 1, color: "#ffffff" }}>{String(mintDeadline.hours).padStart(2, "0")}</div>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", marginTop: "2px" }}>HRS</div>
                </div>
                <span style={{ fontSize: "24px", color: "rgba(251,191,36,0.5)", paddingBottom: "14px", alignSelf: "flex-end" }}>:</span>
                <div style={{ textAlign: "center" }}>
                  <div className="font-black font-mono" style={{ fontSize: "32px", lineHeight: 1, color: "#ffffff" }}>{String(mintDeadline.mins).padStart(2, "0")}</div>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", marginTop: "2px" }}>MIN</div>
                </div>
                <span style={{ fontSize: "24px", color: "rgba(251,191,36,0.5)", paddingBottom: "14px", alignSelf: "flex-end" }}>:</span>
                <div style={{ textAlign: "center" }}>
                  <div className="font-black font-mono" style={{ fontSize: "32px", lineHeight: 1, color: "#fbbf24", filter: "drop-shadow(0 0 8px rgba(251,191,36,0.7))" }}>{String(mintDeadline.secs).padStart(2, "0")}</div>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", marginTop: "2px" }}>SEC</div>
                </div>
              </div>
            )}

            <button
              onClick={handleMintNow}
              style={{
                background: "linear-gradient(135deg, #ffd700, #fbbf24, #f59e0b)",
                border: "none", borderRadius: "12px", padding: "13px 26px",
                fontWeight: 900, fontSize: "14px", letterSpacing: "0.06em",
                color: "#000", cursor: "pointer", flexShrink: 0,
                boxShadow: "0 0 28px rgba(251,191,36,0.55), 0 4px 16px rgba(0,0,0,0.4)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(251,191,36,0.8), 0 4px 16px rgba(0,0,0,0.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 28px rgba(251,191,36,0.55), 0 4px 16px rgba(0,0,0,0.4)"; }}
            >
              🔥 {t.eb_mint_now} ↓
            </button>
          </div>

          <style>{`
            @keyframes fomoIconPop {
              0%,100% { transform: scale(1); }
              50%      { transform: scale(1.15); }
            }
          `}</style>
        </div>
      )}

      {/* Mint Closed banner — shows whenever mint is closed for any reason */}
      {mintClosed && (
        <div style={{
          borderRadius: "14px",
          border: "1px solid rgba(239,68,68,0.45)",
          background: "rgba(239,68,68,0.07)",
          boxShadow: "0 0 24px rgba(239,68,68,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}>
          {/* Left */}
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: "16px" }}>🔒</span>
            <span className="font-black tracking-widest uppercase text-sm" style={{ color: "#ef4444" }}>
              {t.nc_mint_closed_badge}
            </span>
            <span className="text-xs font-semibold" style={{ color: "rgba(239,68,68,0.45)" }}>
              · {t.nc_mint_closed_opensea}
            </span>
          </div>
          {/* Right: Trade on OpenSea button */}
          <a
            href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #2081e2, #1868b7)",
              border: "none",
              borderRadius: "10px",
              padding: "9px 18px",
              fontWeight: 900,
              fontSize: "13px",
              color: "#fff",
              textDecoration: "none",
              flexShrink: 0,
              boxShadow: "0 0 18px rgba(32,129,226,0.35)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M45 0C20.15 0 0 20.15 0 45C0 69.85 20.15 90 45 90C69.85 90 90 69.85 90 45C90 20.15 69.85 0 45 0ZM22.18 46.36L22.31 46.14L34.38 27.09C34.56 26.81 34.98 26.84 35.11 27.14C37.06 31.61 38.74 37.18 37.96 40.71C37.63 42.17 36.68 44.14 35.62 45.96C35.49 46.2 35.34 46.43 35.19 46.65C35.12 46.76 35 46.82 34.87 46.82H22.49C22.16 46.82 21.97 46.46 22.18 46.36ZM74.38 52.28C74.38 52.46 74.27 52.62 74.1 52.69C73.38 52.97 71.01 54.04 70.05 55.39C67.63 58.85 65.79 63.82 61.77 63.82H44.46C38.36 63.82 33.41 58.85 33.41 52.72V52.48C33.41 52.31 33.55 52.17 33.72 52.17H47.11C47.31 52.17 47.46 52.35 47.45 52.55C47.38 53.2 47.5 53.86 47.8 54.46C48.38 55.65 49.59 56.41 50.9 56.41H57.35V52.57H50.97C50.64 52.57 50.44 52.19 50.63 51.92C50.7 51.81 50.78 51.7 50.87 51.58C51.5 50.71 52.42 49.37 53.33 47.84C53.96 46.8 54.57 45.68 55.06 44.56C55.16 44.35 55.24 44.13 55.32 43.91C55.46 43.52 55.6 43.16 55.71 42.79C55.82 42.47 55.91 42.14 55.98 41.82C56.19 40.84 56.28 39.8 56.28 38.72C56.28 38.31 56.26 37.88 56.22 37.47C56.2 37.04 56.14 36.61 56.08 36.18C56.03 35.79 55.96 35.4 55.87 35.02C55.76 34.54 55.63 34.07 55.48 33.6L55.43 33.43C55.3 33.01 55.14 32.6 54.97 32.2C54.39 30.73 53.72 29.31 52.99 27.98C52.73 27.5 52.45 27.04 52.17 26.59C51.87 26.1 51.56 25.63 51.23 25.19C51.02 24.9 50.8 24.62 50.57 24.36C50.34 24.08 50.1 23.82 49.87 23.57C49.53 23.22 49.2 22.9 48.86 22.6L47.93 21.82C47.79 21.71 47.7 21.54 47.72 21.36L48.17 18.12C48.21 17.82 48.53 17.66 48.8 17.8L74.1 31.52C74.27 31.61 74.38 31.78 74.38 31.97V52.28Z" fill="white"/>
            </svg>
            {t.nc_trade_opensea}
          </a>
        </div>
      )}


      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilter("ALL")}
          className={`px-4 py-1.5 text-xs font-bold transition-all duration-150 ${
            filter === "ALL" ? "tab-pill-active" : "tab-pill-inactive"
          }`}>
          {t.nc_filter_all}
        </button>
        <button onClick={() => setFilter("YOURS")}
          className={`px-4 py-1.5 text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
            filter === "YOURS" ? "tab-pill-active" : "tab-pill-inactive"
          }`}
          style={filter === "YOURS" ? {} : { borderColor: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>
          <span>⚽</span>
          <span>{t.nc_filter_mine}</span>
          {ownedIds.size > 0 && (
            <span style={{
              background: filter === "YOURS" ? "rgba(0,82,255,0.25)" : "rgba(251,191,36,0.15)",
              borderRadius: "99px",
              padding: "0 5px",
              fontSize: "10px",
              fontWeight: 900,
            }}>
              {ownedIds.size}
            </span>
          )}
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={36} className="animate-spin" style={{ color: "#0052FF" }} />
          <p style={{ color: "#6b7a9a" }}>{t.nc_loading}</p>
        </div>
      ) : filter === "YOURS" && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span style={{ fontSize: "48px" }}>⚽</span>
          <p className="font-bold text-white text-lg">{t.nc_no_nfts}</p>
          <p className="text-sm" style={{ color: "#6b7a9a" }}>
            {address ? t.nc_no_nfts_sub : t.nc_connect_nfts}
          </p>
        </div>
      ) : (
        <div
          ref={cardsGridRef}
          className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3${flashCards ? " cards-flashing" : ""}`}
        >
          {filtered.map((country) => (
            <CountryCard key={country.id} country={country}
              isWinner={!!tournamentFinalized && Number(winningCountryId) === country.id}
              isEliminated={isElim(country.id)}
              mintClosed={mintClosed}
              openSeaUrl={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${country.id}`}
            />
          ))}
        </div>
      )}

      {/* Mint Distribution Bar Chart — below the grid */}
      <MintBarChart
        eliminationStatus={eliminationStatus as boolean[] | undefined}
        tournamentFinalized={!!tournamentFinalized}
        winningCountryId={winningCountryId as bigint | undefined}
      />
    </div>
  );
}
