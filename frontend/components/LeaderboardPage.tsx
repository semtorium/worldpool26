"use client";

import { useEffect, useState, useRef } from "react";
import { usePublicClient, useAccount, useConnect } from "wagmi";
import { shortenAddress } from "@/lib/config";
import { fetchLogsWithCache } from "@/lib/logCache";
import { Loader2, Trophy, Medal } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

interface LeaderEntry {
  address: string;
  nfts:    number;
  votes:   number;
  total:   number;
  rank:    number;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardPage() {
  const client = usePublicClient();
  const { address, isConnected } = useAccount();
  const { connect, connectors }  = useConnect();
  const login = () => connect({ connector: connectors[0] });
  const { t } = useLang();

  const [top50,     setTop50]     = useState<LeaderEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderEntry | undefined>();
  const [loading,   setLoading]   = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (!client) return;

    async function fetchData() {
      // Only show spinner on very first load
      if (!initialized.current) setLoading(true);
      try {
        const c = client as NonNullable<typeof client>;
        const [mintLogs, voteLogs] = await Promise.all([
          fetchLogsWithCache(c, "event CountryMinted(address indexed user, uint256 indexed countryId, uint256 amount, uint256 timestamp)"),
          fetchLogsWithCache(c, "event VoteCast(address indexed user, string playerName, uint256 votes, uint256 timestamp)"),
        ]);

        const nftMap:  Record<string, number> = {};
        const voteMap: Record<string, number> = {};

        for (const log of mintLogs) {
          const u = (log.args.user as string).toLowerCase();
          nftMap[u]  = (nftMap[u]  ?? 0) + Number(log.args.amount);
        }
        for (const log of voteLogs) {
          const u = (log.args.user as string).toLowerCase();
          voteMap[u] = (voteMap[u] ?? 0) + Number(log.args.votes);
        }

        const sorted: LeaderEntry[] = Array.from(
          new Set([...Object.keys(nftMap), ...Object.keys(voteMap)])
        )
          .map(addr => ({
            address: addr,
            nfts:    nftMap[addr]  ?? 0,
            votes:   voteMap[addr] ?? 0,
            total:   (nftMap[addr] ?? 0) + (voteMap[addr] ?? 0),
            rank:    0,
          }))
          .sort((a, b) => b.total - a.total || b.nfts - a.nfts)
          .map((e, i) => ({ ...e, rank: i + 1 }));

        setTop50(sorted.slice(0, 50));

        // User rank — always from full list, even if >50
        const me = address ? sorted.find(e => e.address === address.toLowerCase()) : undefined;
        setUserEntry(me);

        initialized.current = true;
      } catch (e) {
        console.error("[Leaderboard] fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [client, address]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Trophy size={22} style={{ color: "#fbbf24" }} />
            {t.lb_title}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7a9a" }}>
            {t.lb_subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="live-dot" />
          <span className="text-xs font-bold" style={{ color: "#0052FF" }}>LIVE</span>
        </div>
      </div>

      {/* ── Your stats / connect banner ── */}
      {isConnected ? (
        <div
          className="glass-card p-4 flex flex-wrap items-center gap-3"
          style={{ borderColor: "rgba(0,82,255,0.18)", background: "rgba(0,82,255,0.03)" }}
        >
          <Medal size={20} style={{ color: "#0052FF", flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#6b7a9a" }}>
              {t.lb_your_pos}
            </p>
            <p className="font-black text-white text-lg leading-tight">
              {loading ? "—" : userEntry ? `#${userEntry.rank}` : t.lb_not_ranked}
            </p>
          </div>

          {userEntry && (
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <p className="text-[10px] font-bold mb-0.5" style={{ color: "#0052FF" }}>🌍 {t.lb_mints}</p>
                <p className="font-black text-white text-base">{userEntry.nfts}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold mb-0.5" style={{ color: "#2563EB" }}>⚽ {t.lb_votes}</p>
                <p className="font-black text-white text-base">{userEntry.votes}</p>
              </div>
              <div
                className="text-center px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <p className="text-[10px] font-bold mb-0.5" style={{ color: "#fbbf24" }}>{t.lb_score}</p>
                <p className="font-black text-white text-base">{userEntry.total}</p>
              </div>
            </div>
          )}

          {!loading && !userEntry && (
            <p className="text-xs" style={{ color: "#6b7a9a" }}>
              {t.lb_no_activity}
            </p>
          )}
        </div>
      ) : (
        <div className="glass-card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Medal size={18} style={{ color: "#6b7a9a" }} />
            <p className="text-sm" style={{ color: "#6b7a9a" }}>
              {t.lb_connect_wallet}
            </p>
          </div>
          <button onClick={login} className="btn-neon text-xs px-4 py-2 shrink-0">
            {t.connect}
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>

        {/* Legend row */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 flex-wrap"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}
        >
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#6b7a9a" }}>
            {t.lb_rank}
          </span>
          <span className="ml-auto flex items-center gap-4 text-[10px] font-bold tracking-widest uppercase">
            <span style={{ color: "#0052FF" }}>🌍 {t.lb_mints}</span>
            <span style={{ color: "#2563EB" }}>⚽ {t.lb_votes}</span>
            <span style={{ color: "#fbbf24" }}>{t.lb_score}</span>
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: "#fbbf24" }} />
            <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.lb_loading}</p>
          </div>
        ) : top50.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <p className="text-4xl">🏜️</p>
            <p className="font-bold text-white">{t.lb_empty}</p>
            <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.lb_empty_sub}</p>
          </div>
        ) : (
          <>
            {top50.map((e, i) => {
              const isUser = !!address && e.address === address.toLowerCase();
              const medal  = MEDAL[e.rank];
              return (
                <div
                  key={e.address}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: isUser ? "rgba(0,82,255,0.04)" : undefined,
                  }}
                  onMouseEnter={ev => { if (!isUser) ev.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = isUser ? "rgba(0,82,255,0.04)" : "transparent"; }}
                >
                  <div className="w-8 shrink-0 text-center">
                    {medal
                      ? <span style={{ fontSize: 18 }}>{medal}</span>
                      : <span className="text-sm font-bold" style={{ color: "#6b7a9a" }}>#{e.rank}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span
                      className="font-mono text-sm font-bold truncate"
                      style={{ color: isUser ? "#0052FF" : "#f0f4ff" }}
                    >
                      {shortenAddress(e.address)}
                    </span>
                    {isUser && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(0,82,255,0.12)", color: "#0052FF", border: "1px solid rgba(0,82,255,0.25)" }}
                      >
                        YOU
                      </span>
                    )}
                    <span className="sm:hidden ml-auto text-xs shrink-0" style={{ color: "#6b7a9a" }}>
                      🌍{e.nfts} ⚽{e.votes}
                    </span>
                  </div>

                  <div className="hidden sm:block w-14 text-right">
                    <span className="font-semibold text-sm" style={{ color: "#0052FF" }}>{e.nfts}</span>
                  </div>
                  <div className="hidden sm:block w-14 text-right">
                    <span className="font-semibold text-sm" style={{ color: "#2563EB" }}>{e.votes}</span>
                  </div>
                  <div className="w-12 text-right shrink-0">
                    <span className="font-black text-sm" style={{ color: i < 3 ? "#fbbf24" : "#f0f4ff" }}>
                      {e.total}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* User >50: show separator + their row */}
            {userEntry && userEntry.rank > 50 && (
              <>
                <div
                  className="flex items-center gap-2 px-4 py-1.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}
                >
                  <div className="flex-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
                  <span className="text-[10px] font-bold" style={{ color: "#6b7a9a" }}>···</span>
                  <div className="flex-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: "rgba(0,82,255,0.04)" }}
                >
                  <div className="w-8 shrink-0 text-center">
                    <span className="text-sm font-bold" style={{ color: "#6b7a9a" }}>#{userEntry.rank}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold truncate" style={{ color: "#0052FF" }}>
                      {shortenAddress(userEntry.address)}
                    </span>
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(0,82,255,0.12)", color: "#0052FF", border: "1px solid rgba(0,82,255,0.25)" }}
                    >
                      YOU
                    </span>
                    <span className="sm:hidden ml-auto text-xs shrink-0" style={{ color: "#6b7a9a" }}>
                      🌍{userEntry.nfts} ⚽{userEntry.votes}
                    </span>
                  </div>
                  <div className="hidden sm:block w-14 text-right">
                    <span className="font-semibold text-sm" style={{ color: "#0052FF" }}>{userEntry.nfts}</span>
                  </div>
                  <div className="hidden sm:block w-14 text-right">
                    <span className="font-semibold text-sm" style={{ color: "#2563EB" }}>{userEntry.votes}</span>
                  </div>
                  <div className="w-12 text-right shrink-0">
                    <span className="font-black text-sm" style={{ color: "#f0f4ff" }}>{userEntry.total}</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer note */}
      {!loading && top50.length > 0 && (
        <p className="text-center text-[11px]" style={{ color: "rgba(107,122,154,0.45)" }}>
          {t.lb_footer}
        </p>
      )}
    </div>
  );
}
