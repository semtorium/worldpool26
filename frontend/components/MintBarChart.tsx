"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESS, shortenAddress } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";
import { fetchLogsWithCache } from "@/lib/logCache";

const RANK_EMOJIS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

interface HolderEntry { address: string; count: number; }
interface CountrySupply { id: number; name: string; flagCode: string; supply: number; }

interface Props {
  eliminationStatus:   readonly boolean[] | boolean[] | undefined;
  tournamentFinalized: boolean;
  winningCountryId:    bigint | undefined;
}

export function MintBarChart({ eliminationStatus, tournamentFinalized, winningCountryId }: Props) {
  const { t } = useLang();
  const client = usePublicClient();
  const [supplies,  setSupplies]  = useState<CountrySupply[]>([]);
  const [animated,  setAnimated]  = useState(false);

  // Tooltip state
  const [hoveredId,    setHoveredId]    = useState<number | null>(null);
  const [tooltipPos,   setTooltipPos]   = useState<{ x: number; y: number } | null>(null);
  const [holders,      setHolders]      = useState<HolderEntry[]>([]);
  const [loadingTip,   setLoadingTip]   = useState(false);
  const holderCache  = useRef<Map<number, HolderEntry[]>>(new Map());
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch total supply for all countries from CountryMinted events (every 30s)
  useEffect(() => {
    if (!client) return;
    const c = client;
    async function load() {
      try {
        const logs = await fetchLogsWithCache(c, "event CountryMinted(address indexed user, uint256 indexed countryId, uint256 amount, uint256 timestamp)");
        const supplyMap: Record<number, number> = {};
        for (const log of logs) {
          const id     = Number(log.args.countryId as bigint);
          const amount = Number(log.args.amount as bigint);
          supplyMap[id] = (supplyMap[id] ?? 0) + amount;
        }
        setSupplies(COUNTRIES.map(c => ({ id: c.id, name: c.name, flagCode: c.flagCode, supply: supplyMap[c.id] ?? 0 })));
      } catch { /* silent */ }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  // Animate bars after data arrives
  useEffect(() => {
    if (supplies.length > 0) {
      const id = setTimeout(() => setAnimated(true), 80);
      return () => clearTimeout(id);
    }
  }, [supplies]);

  // Fetch top holders for a country from CountryMinted events
  const fetchHolders = useCallback(async (countryId: number) => {
    if (!client) return;
    if (holderCache.current.has(countryId)) {
      setHolders(holderCache.current.get(countryId)!);
      return;
    }
    setLoadingTip(true);
    try {
      // Fetch all CountryMinted logs (cached) then filter by countryId
      const allLogs = await fetchLogsWithCache(client, "event CountryMinted(address indexed user, uint256 indexed countryId, uint256 amount, uint256 timestamp)");
      const logs = allLogs.filter((l: { args: { countryId: bigint } }) => Number(l.args.countryId) === countryId);
      const totals: Record<string, number> = {};
      for (const log of logs) {
        const addr   = (log.args.user as string).toLowerCase();
        const amount = Number(log.args.amount as bigint);
        totals[addr] = (totals[addr] ?? 0) + amount;
      }
      const sorted: HolderEntry[] = Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([address, count]) => ({ address, count }));
      holderCache.current.set(countryId, sorted);
      setHolders(sorted);
    } catch { setHolders([]); }
    finally { setLoadingTip(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const handleBarEnter = (countryId: number, e: React.MouseEvent) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredId(countryId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    fetchHolders(countryId);
  };

  const handleBarLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredId(null);
      setTooltipPos(null);
    }, 180);
  };

  const handleTooltipEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };

  const minted = supplies
    .filter(c => c.supply > 0)
    .sort((a, b) => b.supply - a.supply);

  if (minted.length === 0) return null;

  const max        = Math.max(...minted.map(c => c.supply));
  const BAR_MAX_H  = 130;
  const BAR_MIN_H  = 8;
  const total      = minted.reduce((s, c) => s + c.supply, 0);

  const summaryText = t.chart_summary
    .replace("{n}", String(minted.length))
    .replace("{total}", String(total));

  // Tooltip content
  const hoveredCountry = hoveredId ? COUNTRIES.find(c => c.id === hoveredId) : null;

  return (
    <>
      {/* ── Floating Tooltip (fixed position) ── */}
      {hoveredId !== null && tooltipPos && (
        <div
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleBarLeave}
          style={{
            position: "fixed",
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            pointerEvents: "auto",
          }}
        >
          <div style={{
            background: "rgba(6,9,22,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: "12px 14px",
            minWidth: 190,
            maxWidth: 230,
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          }}>
            {/* Arrow */}
            <div style={{
              position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
              width: 12, height: 6, overflow: "hidden",
            }}>
              <div style={{
                width: 12, height: 12, background: "rgba(6,9,22,0.97)",
                border: "1px solid rgba(255,255,255,0.12)",
                transform: "rotate(45deg) translate(-3px, -3px)",
              }} />
            </div>

            {/* Country header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 19, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                <img src={`https://flagcdn.com/w40/${hoveredCountry?.flagCode}.png`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>{hoveredCountry?.name}</p>
                <p style={{ color: "#6b7a9a", fontSize: 10 }}>
                  {minted.find(c => c.id === hoveredId)?.supply ?? 0} {t.chart_nft}
                </p>
              </div>
            </div>

            <p style={{ color: "#6b7a9a", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
              {t.chart_top_holders}
            </p>

            {loadingTip ? (
              <p style={{ color: "#6b7a9a", fontSize: 12, textAlign: "center", padding: "6px 0" }}>{t.chart_loading}</p>
            ) : holders.length === 0 ? (
              <p style={{ color: "#6b7a9a", fontSize: 12, textAlign: "center", padding: "6px 0" }}>{t.chart_no_holders}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {holders.map((h, i) => (
                  <div key={h.address} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>{RANK_EMOJIS[i]}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {shortenAddress(h.address)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#0052FF", fontFamily: "monospace", flexShrink: 0 }}>
                      {h.count} {t.chart_nft}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chart Card ── */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "20px 20px 16px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0052FF", flexShrink: 0, boxShadow: "0 0 8px #0052FF", animation: "livePulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {t.chart_title}
          </span>
          <span style={{ fontSize: 12, color: "#6b7a9a" }}>— {summaryText}</span>
        </div>

        {/* Scrollable bars */}
        <div className="scrollbar-hide" style={{ overflowX: "auto" }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            minWidth: "max-content",
            paddingBottom: 1,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            {minted.map(c => {
              const isWinner = tournamentFinalized && Number(winningCountryId) === c.id;
              const isElim   = !!(eliminationStatus as boolean[] | undefined)?.[c.id] || (tournamentFinalized && !isWinner);
              const barH     = Math.max(BAR_MIN_H, Math.round((c.supply / max) * BAR_MAX_H));
              const isHovered = hoveredId === c.id;

              const barGrad = isWinner
                ? "linear-gradient(180deg, #fbbf24 0%, rgba(251,191,36,0.5) 100%)"
                : isElim
                  ? "linear-gradient(180deg, rgba(239,68,68,0.5) 0%, rgba(239,68,68,0.15) 100%)"
                  : "linear-gradient(180deg, #0052FF 0%, rgba(0,82,255,0.3) 100%)";

              const glow = isHovered
                ? isWinner ? "0 0 20px rgba(251,191,36,0.6)" : isElim ? "0 0 16px rgba(239,68,68,0.3)" : "0 0 20px rgba(0,82,255,0.45)"
                : isWinner ? "0 0 14px rgba(251,191,36,0.35)" : isElim ? "none" : "0 0 10px rgba(0,82,255,0.2)";

              const countCol = isWinner ? "#fbbf24" : isElim ? "rgba(255,255,255,0.25)" : "#0052FF";
              const nameCol  = isElim ? "rgba(255,255,255,0.2)" : isHovered ? "#fff" : "rgba(255,255,255,0.5)";

              return (
                <div
                  key={c.id}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: 54, flexShrink: 0, cursor: "pointer" }}
                  onMouseEnter={e => handleBarEnter(c.id, e)}
                  onMouseLeave={handleBarLeave}
                >
                  {/* Count */}
                  <span style={{
                    fontSize: 13, fontWeight: 900, fontFamily: "monospace",
                    color: countCol, marginBottom: 5,
                    opacity: isElim ? 0.6 : 1,
                    transition: "transform 0.15s",
                    transform: isHovered ? "scale(1.15)" : "scale(1)",
                    textShadow: isWinner ? "0 0 10px rgba(251,191,36,0.6)" : isElim ? "none" : isHovered ? "0 0 10px rgba(0,82,255,0.7)" : "0 0 8px rgba(0,82,255,0.4)",
                  }}>
                    {c.supply}
                  </span>

                  {/* Bar */}
                  <div style={{ height: BAR_MAX_H, width: "100%", display: "flex", alignItems: "flex-end" }}>
                    <div style={{
                      width: "100%",
                      height: animated ? barH : 0,
                      borderRadius: "5px 5px 2px 2px",
                      background: barGrad,
                      boxShadow: glow,
                      transition: "height 0.7s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.15s, filter 0.15s",
                      filter: isHovered ? "brightness(1.25)" : "brightness(1)",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0,
                        height: "45%",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)",
                        borderRadius: "5px 5px 0 0",
                      }} />
                    </div>
                  </div>

                  {/* Flag */}
                  <div style={{
                    width: 36, height: 24, marginTop: 8, borderRadius: 4, overflow: "hidden",
                    border: isWinner ? "1.5px solid rgba(251,191,36,0.55)" : isElim ? "1px solid rgba(255,255,255,0.07)" : isHovered ? "1px solid rgba(0,82,255,0.45)" : "1px solid rgba(255,255,255,0.14)",
                    opacity: isElim ? 0.3 : 1,
                    boxShadow: isWinner ? "0 0 10px rgba(251,191,36,0.45)" : isHovered ? "0 0 8px rgba(0,82,255,0.3)" : "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    flexShrink: 0,
                  }}>
                    <img src={`https://flagcdn.com/w40/${c.flagCode}.png`} alt={c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                  </div>

                  {/* Name */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: nameCol, textAlign: "center",
                    lineHeight: 1.3, marginTop: 5, maxWidth: 54,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    transition: "color 0.15s",
                  }}>
                    {c.name}
                  </span>

                  {/* Status */}
                  {isWinner
                    ? <span style={{ fontSize: 13, marginTop: 3 }}>🏆</span>
                    : isElim
                      ? <span style={{ fontSize: 10, color: "rgba(239,68,68,0.5)", marginTop: 3 }}>✕</span>
                      : null
                  }
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          {[
            { grad: "linear-gradient(180deg,#0052FF,rgba(0,82,255,0.4))", label: t.chart_active },
            { grad: "linear-gradient(180deg,rgba(239,68,68,0.5),rgba(239,68,68,0.15))", label: t.chart_eliminated },
            { grad: "linear-gradient(180deg,#fbbf24,rgba(251,191,36,0.5))", label: t.chart_champion },
          ].map(({ grad, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: grad, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#6b7a9a" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
