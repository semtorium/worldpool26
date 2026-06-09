"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Ticket, Trophy, Zap, Search } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, TICKET_PRICE, TOP_SCORER_PLAYERS, formatEth } from "@/lib/config";

const TS_CLAIMED_KEY = (addr: string) => `ts_claimed_${CONTRACT_ADDRESS}_${addr}`;
import { getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";
import { TicketSuccessModal } from "@/components/TicketSuccessModal";
import { TxErrorModal } from "@/components/TxErrorModal";
import { parseWriteError } from "@/lib/parseError";
import { useEthUsd } from "@/lib/useEthUsd";

export function TopScorerPage() {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { openConnectModal }     = useConnectModal();
  const login = () => openConnectModal?.();
  const { switchChain } = useSwitchChain();
  const isWrongChain = isConnected && walletChainId !== base.id;
  const { t } = useLang();
  const ethUsd = useEthUsd();
  const queryClient = useQueryClient();

  const [ticketQty, setTicketQty]     = useState(1);
  const [voteAmounts, setVoteAmounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightPlayer, setHighlightPlayer] = useState<string | null>(null);
  const [flashList, setFlashList]     = useState(false);
  const [modalData, setModalData]     = useState<{ tickets: number; unused: number } | null>(null);

  // Refs
  const purchasedQtyRef = useRef(1);
  const playerListRef   = useRef<HTMLDivElement>(null);
  const playerRowRefs   = useRef<Map<string, HTMLDivElement>>(new Map());
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: ticketBalance, refetch: refetchTickets } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "userUnusedTickets",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const { data: topScorerFinalized } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" });
  const { data: finalTopScorer }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" });
  const { data: votingClosed }       = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "votingClosed", query: { refetchInterval: 30_000 } });

  // How many votes did the user cast for the winning player? (only relevant after finalization)
  const { data: userWinnerVotes } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "getUserVotesForPlayer",
    args: address && finalTopScorer ? [address, finalTopScorer as string] : undefined,
    query: { enabled: !!address && !!topScorerFinalized && !!finalTopScorer },
  });
  const userWinnerVoteCount = Number(userWinnerVotes ?? 0n);

  // On-chain ground truth for "already claimed" — works across devices/browsers
  const { data: onChainHasClaimed } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "topScorerHasClaimed",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!topScorerFinalized },
  });

  // Global votes per player — 5s refresh for live vote bar
  const playerVoteQueries = TOP_SCORER_PLAYERS.map(p =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "getPlayerVotes",
      args: [p.name],
      query: { refetchInterval: 5_000 },
    })
  );

  const { writeContract: buyTickets, data: buyHash, isPending: isBuying, error: buyError, reset: resetBuy } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess, error: buyReceiptError } = useWaitForTransactionReceipt({ hash: buyHash });
  const { writeContract: vote, data: voteHash, isPending: isVoting, error: voteError, reset: resetVote } = useWriteContract();
  const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess, error: voteReceiptError } = useWaitForTransactionReceipt({ hash: voteHash });
  const { writeContract: claim, data: claimHash, isPending: isClaiming, error: claimError, reset: resetClaim } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimTxSuccess, error: claimReceiptError } = useWaitForTransactionReceipt({ hash: claimHash });

  // Aktif hata — hangisi varsa göster (öncelik sırası: claim > buy > vote)
  const activeTxError = claimError ?? claimReceiptError ?? buyError ?? buyReceiptError ?? voteError ?? voteReceiptError ?? null;
  const resetActiveTxError = () => { resetClaim(); resetBuy(); resetVote(); };

  // Persist claimed state + invalidate pool cache so PrizeCounter updates instantly
  useEffect(() => {
    if (isClaimTxSuccess && address) {
      localStorage.setItem(TS_CLAIMED_KEY(address.toLowerCase()), "true");
      queryClient.invalidateQueries();
    }
  }, [isClaimTxSuccess, address, queryClient]);

  // isClaimSuccess: tx just confirmed OR on-chain mapping true (cross-device) OR localStorage flag
  // Guard: only show "Claimed" if the user actually had winning votes — prevents false positive
  // when onChainHasClaimed is true but userWinnerVoteCount is 0 (e.g. stale on-chain state from
  // a previous test run, or the user never voted for the winner).
  const isClaimSuccess = userWinnerVoteCount > 0 && (
    isClaimTxSuccess ||
    !!onChainHasClaimed ||
    (!!address && localStorage.getItem(TS_CLAIMED_KEY(address.toLowerCase())) === "true")
  );

  // Show modal + refetch after buy
  useEffect(() => {
    if (isBuySuccess) {
      const bought = purchasedQtyRef.current;
      setModalData({ tickets: bought, unused: Number(ticketBalance ?? 0n) + bought });
      refetchTickets();
      queryClient.invalidateQueries();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuySuccess]);

  useEffect(() => {
    if (isVoteSuccess) {
      refetchTickets();
      queryClient.invalidateQueries();
    }
  }, [isVoteSuccess, refetchTickets, queryClient]);

  const { data: ethBalance } = useBalance({ address, query: { refetchInterval: 5_000 } });

  const unusedTickets  = Number(ticketBalance ?? 0n);
  const totalCost      = TICKET_PRICE * BigInt(ticketQty);
  const hasEnoughEth   = !ethBalance || ethBalance.value >= totalCost;

  const playersWithVotes = TOP_SCORER_PLAYERS
    .map((p, i) => ({ ...p, votes: Number(playerVoteQueries[i].data ?? 0n) }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = Math.max(...playersWithVotes.map(p => p.votes), 1);
  const top5     = playersWithVotes.slice(0, 5);

  // Search dropdown matches
  const searchMatches = searchQuery.trim()
    ? playersWithVotes.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.country.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSelectPlayer = (name: string) => {
    setHighlightPlayer(name);
    setSearchQuery("");
    setShowDropdown(false);
    const el = playerRowRefs.current.get(name);
    if (el) {
      const headerEl = document.querySelector("header");
      const headerH = (headerEl?.offsetHeight ?? 110) + 16;
      const elTop = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elTop - headerH, behavior: "smooth" });
    }
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 1) setTicketQty(num);
    else if (e.target.value === "") setTicketQty(1);
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Vote Now: scroll to player list + flash (header-aware)
  const handleVoteNow = () => {
    setTimeout(() => {
      if (playerListRef.current) {
        const headerEl = document.querySelector("header");
        const headerH = (headerEl?.offsetHeight ?? 110) + 16;
        const elTop = playerListRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: elTop - headerH, behavior: "smooth" });
      }
      setFlashList(true);
      setTimeout(() => setFlashList(false), 2200);
    }, 80);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Claim banner */}
      {topScorerFinalized && isConnected && (
        <div className="glass-card p-5"
          style={{
            borderColor: userWinnerVoteCount > 0 ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)",
            background:  userWinnerVoteCount > 0 ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.02)",
          }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white flex items-center gap-2">
                <Trophy size={18} style={{ color: "#fbbf24" }} /> {t.ts_finalized}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#6b7a9a" }}>
                {t.ts_winner}: <span className="text-white font-semibold">{finalTopScorer as string}</span>
              </p>
            </div>

            {/* Claimed already */}
            {isClaimSuccess ? (
              <span className="text-xs font-semibold shrink-0 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                style={{ background: "rgba(0,82,255,0.1)", border: "1px solid rgba(0,82,255,0.3)", color: "#0052FF" }}>
                {t.ts_claimed_badge}
              </span>
            ) : userWinnerVoteCount > 0 ? (
              /* Active claim button */
              <button
                onClick={() => claim({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "claimTopScorerRewards", args: [] })}
                disabled={isClaiming || isClaimConfirming}
                className="btn-neon flex items-center gap-2 shrink-0"
                style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
                {(isClaiming || isClaimConfirming) && <Loader2 size={16} className="animate-spin" />}
                {t.ts_claim}
              </button>
            ) : (
              /* No winning votes */
              <span className="text-xs font-semibold shrink-0 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", color: "#6b7a9a" }}>
                {t.ts_no_winning_votes}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Voting closed banner */}
      {votingClosed && !topScorerFinalized && (
        <div className="glass-card p-4 flex items-center gap-3"
          style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)" }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <p className="font-black text-sm" style={{ color: "#ef4444" }}>{t.ts_voting_closed}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(239,68,68,0.6)" }}>{t.ts_voting_closed_sub}</p>
          </div>
        </div>
      )}

      {/* Buy tickets */}
      {!topScorerFinalized && !votingClosed && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(37,99,235,0.25),rgba(0,82,255,0.15))", border: "1px solid rgba(37,99,235,0.25)" }}>
              <Ticket size={20} style={{ color: "#2563EB" }} />
            </div>
            <div>
              <h2 className="font-black text-white text-lg">{t.ts_buy_title}</h2>
              <p className="text-xs" style={{ color: "#6b7a9a" }}>{t.ts_buy_sub}</p>
            </div>
            {/* Unused tickets counter — right side */}
            {isConnected && unusedTickets > 0 && (
              <div className="ml-auto shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                <span className="text-xs font-semibold" style={{ color: "#6b7a9a" }}>{t.ts_unused_label}</span>
                <span className="font-black text-lg text-white">{unusedTickets}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => setTicketQty(q => Math.max(1, q - 1))}
                className="btn-ghost rounded-lg px-3 py-2 text-lg font-bold">−</button>
              <input
                type="number"
                min={1}
                value={ticketQty}
                onChange={handleQtyChange}
                className="flex-1 text-center font-black text-xl text-white bg-transparent border-none outline-none"
                style={{ minWidth: 0 }}
              />
              <button
                onClick={() => setTicketQty(q => q + 1)}
                className="btn-ghost rounded-lg px-3 py-2 text-lg font-bold">+</button>
            </div>

            {isConnected ? (
              <button
                onClick={() => {
                  if (isWrongChain) { switchChain({ chainId: base.id }); return; }
                  purchasedQtyRef.current = ticketQty;
                  buyTickets({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "buyScorerTickets", args: [BigInt(ticketQty)], value: totalCost });
                }}
                disabled={isBuying || isBuyConfirming || (!isWrongChain && !hasEnoughEth)}
                title={!hasEnoughEth ? t.ts_insufficient_eth : undefined}
                className="btn-neon flex items-center justify-center gap-2 w-full sm:w-auto"
                style={!hasEnoughEth ? { opacity: 0.45, cursor: "not-allowed", background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff6060" } : undefined}>
                {(isBuying || isBuyConfirming) && <Loader2 size={16} className="animate-spin" />}
                {isWrongChain ? t.switch_network : !hasEnoughEth ? t.ts_insufficient_eth : (
                  <span className="flex flex-col items-center leading-tight gap-0.5">
                    <span>{t.ts_buy_btn} · {formatEth(totalCost, 4)} ETH</span>
                    {ethUsd && (
                      <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 600 }}>
                        ≈ ${(Number(totalCost) / 1e18 * ethUsd).toFixed(2)}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ) : (
              <button onClick={() => login()} className="btn-neon w-full sm:w-auto flex items-center justify-center">
                {t.connect}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unused tickets alert — animated */}
      {isConnected && unusedTickets > 0 && !topScorerFinalized && !votingClosed && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.3)",
            color: "#fbbf24",
            animation: "ticketAlertPulse 2.5s ease-in-out infinite",
          }}>
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#fbbf24" }} />
            <span className="relative inline-flex rounded-full h-3 w-3"
              style={{ background: "#fbbf24" }} />
          </span>
          <span
            dangerouslySetInnerHTML={{
              __html: t.ts_unused_alert.replace("{n}", `<strong style="color:white">${unusedTickets}</strong>`),
            }}
          />
        </div>
      )}

      {/* Vote list */}
      <div
        ref={playerListRef}
        className="glass-card p-5 space-y-3 transition-all duration-300"
        style={flashList ? {
          borderColor: "rgba(0,82,255,0.55)",
          boxShadow: "0 0 32px rgba(0,82,255,0.25), 0 0 8px rgba(37,99,235,0.2)",
          animation: "listFlash 0.55s ease-in-out 4",
        } : undefined}
      >
        {/* Header with search */}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-black text-white text-lg flex items-center gap-2 shrink-0">
            <Zap size={20} style={{ color: "#2563EB" }} /> {t.ts_vote_title}
          </h2>
          {/* Search input with dropdown */}
          <div ref={searchContainerRef} className="relative ml-auto">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${showDropdown && searchMatches.length > 0 ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.09)"}`,
                width: "180px",
              }}
            >
              <Search size={13} style={{ color: "#6b7a9a", flexShrink: 0 }} />
              <input
                type="text"
                placeholder={t.ts_search_placeholder}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-[#3d4a63] min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setShowDropdown(false); setHighlightPlayer(null); }}
                  className="text-xs font-bold shrink-0"
                  style={{ color: "#6b7a9a" }}
                >✕</button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && searchMatches.length > 0 && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
                style={{
                  width: "220px",
                  background: "#0d1120",
                  border: "1px solid rgba(37,99,235,0.35)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {searchMatches.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => handleSelectPlayer(p.name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      borderBottom: i < searchMatches.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,99,235,0.12)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <Image
                      src={getFlagUrl(p.flag, 80)} alt={p.country}
                      width={20} height={15}
                      className="rounded shrink-0 object-cover" unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{p.name}</p>
                      <p className="text-xs truncate" style={{ color: "#6b7a9a" }}>{p.country}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {playersWithVotes.map((player) => {
            const pct      = (player.votes / maxVotes) * 100;
            const myVote   = voteAmounts[player.name] ?? 1;
            const canVote  = unusedTickets > 0 && !topScorerFinalized && !votingClosed && isConnected;
            const isWinner = topScorerFinalized && finalTopScorer === player.name;
            const isHighlighted = highlightPlayer === player.name;

            return (
              <div
                key={player.name}
                ref={el => {
                  if (el) playerRowRefs.current.set(player.name, el);
                  else playerRowRefs.current.delete(player.name);
                }}
                className="p-3 rounded-xl space-y-2 transition-all duration-300"
                style={{
                  background: isHighlighted
                    ? "rgba(37,99,235,0.1)"
                    : isWinner
                      ? "rgba(251,191,36,0.06)"
                      : "rgba(255,255,255,0.02)",
                  border: `1px solid ${
                    isHighlighted
                      ? "rgba(37,99,235,0.55)"
                      : isWinner
                        ? "rgba(251,191,36,0.3)"
                        : "rgba(255,255,255,0.05)"
                  }`,
                  boxShadow: isHighlighted ? "0 0 16px rgba(37,99,235,0.25)" : undefined,
                }}>

                <div className="flex items-center gap-3">
                  <Image
                    src={getFlagUrl(player.flag, 80)} alt={player.country}
                    width={28} height={19}
                    className="rounded object-cover shrink-0" unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {isWinner && <span className="mr-1">🏆</span>}
                      {player.name}
                    </p>
                    <p className="text-xs" style={{ color: "#6b7a9a" }}>{player.country}</p>
                  </div>
                  <span className="font-mono text-base font-black shrink-0"
                    style={{ color: isWinner ? "#fbbf24" : "#4d88ff" }}>
                    {player.votes.toLocaleString()}
                  </span>
                </div>

                {/* Vote bar */}
                <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: isWinner
                        ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                        : "linear-gradient(90deg,#2563EB,#0052FF)",
                    }} />
                </div>

                {/* Vote input */}
                {canVote && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} max={unusedTickets} value={myVote}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1 && v <= unusedTickets)
                          setVoteAmounts(prev => ({ ...prev, [player.name]: v }));
                      }}
                      className="w-16 text-center text-sm font-bold rounded-lg py-1 text-white"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <button
                      onClick={() => { if (isWrongChain) { switchChain({ chainId: base.id }); return; } vote({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "voteTopScorer", args: [player.name, BigInt(myVote)] }); }}
                      disabled={isVoting || isVoteConfirming}
                      className="btn-neon text-xs py-1.5 px-4 flex items-center gap-1">
                      {(isVoting || isVoteConfirming) && <Loader2 size={11} className="animate-spin" />}
                      {t.ts_vote_btn}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Error Modal */}
      {activeTxError && (
        <TxErrorModal
          info={parseWriteError(activeTxError)}
          onClose={resetActiveTxError}
        />
      )}

      {/* Ticket Success Modal */}
      {modalData && (
        <TicketSuccessModal
          ticketsBought={modalData.tickets}
          unusedTotal={modalData.unused}
          top5={top5}
          onClose={() => setModalData(null)}
          onVoteNow={handleVoteNow}
        />
      )}

      <style>{`
        @keyframes listFlash {
          0%,100% { border-color: rgba(255,255,255,0.07); box-shadow: none; }
          25%      { border-color: rgba(0,82,255,0.55);  box-shadow: 0 0 28px rgba(0,82,255,0.22); }
          75%      { border-color: rgba(37,99,235,0.55); box-shadow: 0 0 28px rgba(37,99,235,0.22); }
        }
      `}</style>
    </div>
  );
}
