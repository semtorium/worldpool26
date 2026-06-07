"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useAccount, useDisconnect, useReadContract, useBalance } from "wagmi";
import { X, LogOut, Ticket, Trophy, ExternalLink } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, formatEth, shortenAddress, TOP_SCORER_PLAYERS, MINT_PRICE, TICKET_PRICE } from "@/lib/config";
import { COUNTRIES, getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

function AddressAvatar({ address }: { address: string }) {
  const colors = [
    ["#0052FF", "#2563EB"],
    ["#f59e0b", "#ef4444"],
    ["#3b82f6", "#2563EB"],
    ["#10b981", "#06b6d4"],
  ];
  const idx    = parseInt(address.slice(2, 4), 16) % colors.length;
  const [c1, c2] = colors[idx];
  const letter = address.slice(2, 4).toUpperCase();

  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      {letter}
    </div>
  );
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { t } = useLang();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ETH Balance
  const { data: ethBalance } = useBalance({ address });

  // All 48 country NFT balances in one call
  const { data: nftBalances } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "balanceOfBatch",
    args: address ? [
      Array(48).fill(address) as `0x${string}`[],
      Array.from({ length: 48 }, (_, i) => BigInt(i + 1)),
    ] : undefined,
    query: { enabled: !!address && open },
  });

  // Unused tickets
  const { data: unusedTickets } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "userUnusedTickets",
    args: address ? [address] : undefined,
    query: { enabled: !!address && open },
  });

  // Top scorer: tournament status
  const { data: topScorerFinalized } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" });
  const { data: finalTopScorer }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" });

  // Player votes for each player
  const playerVoteQueries = TOP_SCORER_PLAYERS.map(p =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "getUserVotesForPlayer",
      args: address ? [address, p.name] : undefined,
      query: { enabled: !!address && open },
    })
  );

  const ownedCountries = COUNTRIES.filter((c) => nftBalances && Number(nftBalances[c.id - 1]) > 0);
  const votedPlayers   = TOP_SCORER_PLAYERS
    .map((p, i) => ({ ...p, votes: Number(playerVoteQueries[i].data ?? 0n) }))
    .filter(p => p.votes > 0);

  // Total ETH invested (based on current holdings × mint/ticket price)
  const totalNfts       = nftBalances ? ownedCountries.reduce((s, c) => s + Number(nftBalances[c.id - 1]), 0) : 0;
  const totalTickets    = Number(unusedTickets ?? 0n) + votedPlayers.reduce((s, p) => s + p.votes, 0);
  const totalSpentWei   = BigInt(totalNfts) * MINT_PRICE + BigInt(totalTickets) * TICKET_PRICE;
  const totalSpentEth   = formatEth(totalSpentWei);

  if (!address) return null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: "min(420px, 100vw)",
          background: "#0d1117",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "-20px 0 60px rgba(0,0,0,0.5)" : "none",
        }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <AddressAvatar address={address} />
            <div>
              <p className="font-mono text-sm font-bold text-white">{shortenAddress(address)}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs" style={{ color: "#6b7a9a" }}>
                  {ethBalance ? `${parseFloat(ethBalance.formatted).toFixed(4)} ETH` : "—"}
                </p>
                {totalSpentWei > 0n && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                    {totalSpentEth} ETH yatırıldı
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "#6b7a9a" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f0f4ff")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6b7a9a")}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Country NFTs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🌍</span>
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">{t.pd_my_nfts}</h3>
              {ownedCountries.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold ml-auto"
                  style={{ background: "rgba(0,82,255,0.1)", color: "#0052FF" }}>
                  {ownedCountries.length}
                </span>
              )}
            </div>

            {ownedCountries.length === 0 ? (
              <div className="rounded-2xl p-6 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                <p className="text-3xl mb-2">🏳️</p>
                <p className="text-sm font-semibold text-white">{t.pd_no_nfts}</p>
                <p className="text-xs mt-1" style={{ color: "#6b7a9a" }}>
                  {t.pd_no_nfts_sub}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ownedCountries.map((country) => {
                  const balance = nftBalances ? Number(nftBalances[country.id - 1]) : 0;
                  const openSeaUrl = `https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${country.id}`;
                  return (
                    <div key={country.id}
                      className="rounded-xl overflow-hidden flex flex-col"
                      style={{ border: "1px solid rgba(0,82,255,0.2)" }}>
                      {/* Flag image */}
                      <div className="relative" style={{ aspectRatio: "3/2" }}>
                        <Image src={getFlagUrl(country.flagCode, 160)} alt={country.name}
                          fill className="object-cover" unoptimized />
                        <div className="absolute inset-0"
                          style={{ background: "linear-gradient(to top, rgba(6,9,20,0.85) 0%, transparent 50%)" }} />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5">
                          <p className="text-white text-[10px] font-bold truncate leading-tight">{country.name}</p>
                          <p className="font-mono text-[11px] font-black" style={{ color: "#0052FF" }}>×{balance}</p>
                        </div>
                      </div>
                      {/* Trade button */}
                      <a
                        href={openSeaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold transition-colors"
                        style={{ background: "rgba(32,129,226,0.12)", color: "#60a5fa", borderTop: "1px solid rgba(0,82,255,0.1)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(32,129,226,0.22)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(32,129,226,0.12)")}>
                        <ExternalLink size={10} />
                        Trade on OpenSea
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Scorer Tickets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ticket size={16} style={{ color: "#0052FF" }} />
              <h3 className="font-bold text-white text-sm uppercase tracking-wide">{t.ts_tickets}</h3>
            </div>

            <div className="p-4 rounded-2xl flex items-center justify-between"
              style={{ background: "rgba(0,82,255,0.05)", border: "1px solid rgba(0,82,255,0.12)" }}>
              <div>
                <p className="text-3xl font-black text-white">{Number(unusedTickets ?? 0n)}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7a9a" }}>{t.pd_unused_tickets}</p>
              </div>
              {topScorerFinalized && finalTopScorer && (
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>🏆 {t.pd_winner}</p>
                  <p className="text-sm font-bold text-white">{finalTopScorer as string}</p>
                </div>
              )}
            </div>

            {/* Voted players */}
            {votedPlayers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7a9a" }}>{t.pd_your_votes}</p>
                {votedPlayers.map(player => (
                  <div key={player.name}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Image src={getFlagUrl(player.flag, 80)} alt={player.country}
                      width={28} height={19} className="rounded object-cover shrink-0" unoptimized />
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{player.name}</p>
                      <p className="text-xs" style={{ color: "#6b7a9a" }}>{player.country}</p>
                    </div>
                    <span className="font-mono text-sm font-bold" style={{ color: "#0052FF" }}>
                      {player.votes} {t.pd_votes}
                    </span>
                    {topScorerFinalized && finalTopScorer === player.name && (
                      <span className="text-yellow-400 text-xs">🏆</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {votedPlayers.length === 0 && Number(unusedTickets ?? 0n) === 0 && (
              <p className="text-xs mt-2 text-center py-3" style={{ color: "#6b7a9a" }}>
                {t.pd_no_tickets}
              </p>
            )}
          </div>

          {/* Explorer link */}
          <a href={`https://sepolia.basescan.org/address/${address}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#6b7a9a" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#f0f4ff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#6b7a9a"; }}>
            <ExternalLink size={14} />
            {t.pd_view_explorer}
          </a>
        </div>

        {/* Footer — Disconnect */}
        <div className="p-5 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => { disconnect(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "rgba(255,68,102,0.08)", border: "1px solid rgba(255,68,102,0.2)", color: "#ff4466" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,68,102,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,68,102,0.08)")}>
            <LogOut size={16} />
            {t.disconnect}
          </button>
        </div>
      </div>
    </>
  );
}
