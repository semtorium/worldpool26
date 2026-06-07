"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { CountryCard } from "./CountryCard";
import { MintBarChart } from "./MintBarChart";
import { Loader2, Trophy } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

// June 11 2026 16:00 UTC — opening match kick-off
const TOURNAMENT_START = new Date("2026-06-11T16:00:00Z").getTime();

// June 26 2026 23:59 UTC — last group stage match ends, minting closes
const MINT_DEADLINE = new Date("2026-06-26T23:59:00Z").getTime();

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

function useMintDeadlineCountdown() {
  // null on server / first render to avoid SSR hydration mismatch
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0, MINT_DEADLINE - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Return "not expired, zeros" until mounted so SSR HTML is stable
  if (timeLeft === null) return { expired: false, days: 0, hours: 0, mins: 0, secs: 0 };

  const expired = timeLeft <= 0;
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
  const countdown = useCountdown();
  const mintDeadline = useMintDeadlineCountdown();
  const { address } = useAccount();
  const { t } = useLang();

  const { data: tournamentFinalized, isLoading } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" });
  const { data: winningCountryId }       = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" });
  const { data: eliminationStatus }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllEliminationStatus", query: { refetchInterval: 30_000 } });
  const { data: contractMintClosed }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "mintClosed", query: { refetchInterval: 30_000 } });
  const { data: contractPaused }         = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "paused" });

  // Mint is "closed" when mintClosed flag set OR emergency paused OR tournament finalized OR deadline passed
  const mintClosed = !!contractMintClosed || !!contractPaused || !!tournamentFinalized || mintDeadline.expired;
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

  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

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
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.nc_teams}</p>
          {(() => {
            const elimArr = eliminationStatus as boolean[] | undefined;
            // When tournament finalized: only 1 team (champion) still competing
            if (tournamentFinalized) {
              return <p className="text-xl font-black font-mono" style={{ color: "#fbbf24" }}>1</p>;
            }
            const elimCount = elimArr ? elimArr.filter(Boolean).length : 0;
            const remaining = 48 - elimCount;
            return (
              <p className="text-xl font-black font-mono text-white">
                {remaining}
                {elimCount > 0 && (
                  <span className="text-xs font-semibold ml-1" style={{ color: "#6b7a9a" }}>/ 48</span>
                )}
              </p>
            );
          })()}
        </div>

        {/* Countdown / Live card */}
        <div className="glass-card p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.nc_status}</p>
          {tournamentFinalized ? (
            <p className="text-xl font-black text-white">{t.nc_finalized}</p>
          ) : countdown === null ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="live-dot" />
              <span className="text-xl font-black" style={{ color: "#0052FF" }}>LIVE</span>
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

      {/* Mint deadline banner — hidden after tournament finalized */}
      {!tournamentFinalized && (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
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
