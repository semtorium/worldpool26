"use client";

import { useState, useEffect, useRef } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, EARLY_BIRD_SUPPLY } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
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
  const showEarlyBird  = !tournamentFinalized && ebRemaining > 0;

  // Mint is "closed" when mintClosed flag set OR emergency paused OR tournament finalized OR on-chain deadline passed
  const mintClosed = !!contractMintClosed || !!contractPaused || !!tournamentFinalized || (mintEndTimeMs > 0 && mintDeadline.expired);
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
            <p className="text-2xl font-black text-white">{t.nc_finalized}</p>
          ) : countdown === null ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="live-dot" />
              <span className="text-2xl font-black" style={{ color: "#0052FF" }}>LIVE</span>
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

      {/* Early-Bird Banner — visible while discount slots remain */}
      {showEarlyBird && (
        <div
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(251,191,36,0.5)",
            background: "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(245,158,11,0.04) 100%)",
            boxShadow: "0 0 28px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Left */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div style={{ width: 7, height: 7, minWidth: 7, borderRadius: "50%", background: "#fbbf24", boxShadow: "0 0 8px #fbbf24", animation: "liveDotPulse 1.5s ease-in-out infinite" }} />
              <span className="font-black tracking-[0.2em] uppercase" style={{ fontSize: "13px", color: "#fbbf24" }}>
                🔥 {t.eb_title}
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "rgba(251,191,36,0.5)", paddingLeft: "15px" }}>
              {t.eb_max_tx}
            </span>
          </div>

          {/* Right: slot counter + mint now button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(251,191,36,0.10)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: "10px",
                padding: "6px 14px",
                flexShrink: 0,
              }}
            >
              <span className="font-black font-mono" style={{ fontSize: "18px", color: "#fff" }}>{ebRemaining}</span>
              <span style={{ fontSize: "11px", color: "#6b7a9a" }}>/ {EARLY_BIRD_SUPPLY}</span>
              <span style={{ fontSize: "11px", color: "rgba(251,191,36,0.5)", marginLeft: 2 }}>slots</span>
              <span style={{
                marginLeft: 6, padding: "2px 8px", borderRadius: 99,
                background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.35)",
                fontSize: 11, fontWeight: 900, color: "#fbbf24",
              }}>
                {t.eb_discount}
              </span>
            </div>

            {/* Mint Now CTA */}
            <button
              onClick={handleMintNow}
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                border: "none",
                borderRadius: "10px",
                padding: "8px 18px",
                fontWeight: 900,
                fontSize: "13px",
                letterSpacing: "0.07em",
                color: "#000",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "0 0 18px rgba(251,191,36,0.45)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              {t.eb_mint_now} ↓
            </button>
          </div>
        </div>
      )}

      {/* Mint deadline banner — only shown when admin has set a deadline on-chain */}
      {!tournamentFinalized && mintEndTimeMs > 0 && (
        <div
          style={{
            borderRadius: "14px",
            border: mintDeadline.expired
              ? "1px solid rgba(239,68,68,0.45)"
              : "1px solid rgba(251,191,36,0.45)",
            background: mintDeadline.expired
              ? "rgba(239,68,68,0.07)"
              : "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 100%)",
            boxShadow: mintDeadline.expired
              ? "0 0 24px rgba(239,68,68,0.10), inset 0 1px 0 rgba(255,255,255,0.04)"
              : "0 0 28px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {mintDeadline.expired ? (
            /* ── CLOSED state ── */
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: "16px" }}>🔒</span>
              <span className="font-black tracking-widest uppercase text-sm" style={{ color: "#ef4444" }}>
                {t.nc_mint_closed_badge}
              </span>
              <span className="text-xs font-semibold" style={{ color: "rgba(239,68,68,0.55)" }}>
                · {t.nc_mint_closed_opensea}
              </span>
            </div>
          ) : (
            /* ── LIVE countdown state ── */
            <>
              {/* Left */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div style={{ width: 7, height: 7, minWidth: 7, borderRadius: "50%", background: "#fbbf24", boxShadow: "0 0 8px #fbbf24", animation: "liveDotPulse 1.5s ease-in-out infinite" }} />
                  <span className="font-black tracking-[0.2em] uppercase" style={{ fontSize: "13px", color: "#fbbf24" }}>
                    🔥 {t.nc_last_chance}
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(251,191,36,0.5)", paddingLeft: "15px" }}>
                  {t.nc_last_chance_sub}
                </span>
              </div>

              {/* Right: ticking countdown pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: "10px",
                  padding: "6px 14px",
                  flexShrink: 0,
                }}
              >
                {mintDeadline.days > 0 && (
                  <>
                    <span className="font-black font-mono text-white" style={{ fontSize: "17px" }}>{mintDeadline.days}</span>
                    <span style={{ fontSize: "11px", color: "#6b7a9a" }}>d</span>
                    <span style={{ fontSize: "11px", color: "rgba(251,191,36,0.3)", margin: "0 3px" }}>·</span>
                  </>
                )}
                <span className="font-black font-mono text-white" style={{ fontSize: "17px" }}>{String(mintDeadline.hours).padStart(2, "0")}</span>
                <span style={{ fontSize: "11px", color: "#6b7a9a" }}>h</span>
                <span style={{ fontSize: "11px", color: "rgba(251,191,36,0.3)", margin: "0 3px" }}>·</span>
                <span className="font-black font-mono text-white" style={{ fontSize: "17px" }}>{String(mintDeadline.mins).padStart(2, "0")}</span>
                <span style={{ fontSize: "11px", color: "#6b7a9a" }}>m</span>
                <span style={{ fontSize: "11px", color: "rgba(251,191,36,0.3)", margin: "0 3px" }}>·</span>
                <span className="font-black font-mono" style={{ fontSize: "17px", color: "#fbbf24" }}>{String(mintDeadline.secs).padStart(2, "0")}</span>
                <span style={{ fontSize: "11px", color: "#6b7a9a" }}>s</span>
              </div>
            </>
          )}
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
