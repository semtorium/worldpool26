"use client";

import { useEffect, useState } from "react";
import { usePublicClient, useAccount, useConnect } from "wagmi";
import { parseAbiItem } from "viem";
import { CONTRACT_ADDRESS, shortenAddress, MINT_PRICE, TICKET_PRICE, formatEth } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { Loader2, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

const EXPLORER_TX   = "https://sepolia.basescan.org/tx/";
const EXPLORER_ADDR = "https://sepolia.basescan.org/address/";

// Build a quick countryId → name map
const COUNTRY_MAP: Record<number, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.id, c.name])
);

type EventKind = "mint" | "ticket" | "vote";

interface ActivityItem {
  kind: EventKind;
  address: string;
  txHash: string;
  blockNumber: bigint;
  // mint
  countryId?: number;
  amount?: bigint;
  // ticket
  quantity?: bigint;
  // vote
  playerName?: string;
  votes?: bigint;
}

function relativeTime(blockNumber: bigint, latestBlock: bigint): string {
  // Rough estimate: ~2s per block on Base Sepolia
  const diff = Number(latestBlock - blockNumber);
  const secs = diff * 2;
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function kindMeta(kind: EventKind) {
  if (kind === "mint")   return { emoji: "🏳️", color: "#0052FF" };
  if (kind === "ticket") return { emoji: "🎫", color: "#2563EB" };
  return                        { emoji: "⚽", color: "#fbbf24" };
}

function ActivityRow({ item, latestBlock }: { item: ActivityItem; latestBlock: bigint }) {
  const { t } = useLang();
  const { emoji, color } = kindMeta(item.kind);
  const label = item.kind === "mint" ? t.act_kind_mint : item.kind === "ticket" ? t.act_kind_ticket : t.act_kind_vote;

  let description: string;
  let ethValue: string | null = null;

  if (item.kind === "mint") {
    const country = COUNTRY_MAP[item.countryId!] ?? `#${item.countryId}`;
    description = t.act_desc_mint
      .replace("{amount}", String(item.amount))
      .replace("{country}", country);
    ethValue = formatEth((item.amount ?? 0n) * MINT_PRICE);
  } else if (item.kind === "ticket") {
    const qty = Number(item.quantity);
    const tmpl = qty === 1 ? t.act_desc_ticket_one : t.act_desc_ticket_many;
    description = tmpl.replace("{qty}", String(qty));
    ethValue = formatEth((item.quantity ?? 0n) * TICKET_PRICE);
  } else {
    description = t.act_desc_vote
      .replace("{votes}", String(item.votes))
      .replace("{player}", item.playerName ?? "");
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Kind badge */}
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base"
        style={{ background: `${color}14`, border: `1px solid ${color}30` }}
      >
        {emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <a
            href={`${EXPLORER_ADDR}${item.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs font-bold hover:underline"
            style={{ color }}
          >
            {shortenAddress(item.address)}
          </a>
          <span className="text-xs" style={{ color: "#f0f4ff" }}>{description}</span>
          {ethValue && (
            <span
              className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              {ethValue} ETH
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}14`, color }}
          >
            {label}
          </span>
          <span className="text-[10px]" style={{ color: "#6b7a9a" }}>
            {relativeTime(item.blockNumber, latestBlock)}
          </span>
        </div>
      </div>

      {/* Tx link */}
      <a
        href={`${EXPLORER_TX}${item.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 p-1.5 rounded-lg transition-colors"
        style={{ color: "#6b7a9a" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#f0f4ff")}
        onMouseLeave={e => (e.currentTarget.style.color = "#6b7a9a")}
        title={item.txHash}
      >
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

export function ActivityPage() {
  const client = usePublicClient();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const login = () => connect({ connector: connectors[0] });
  const { t } = useLang();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [latestBlock, setLatestBlock] = useState(0n);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;

    async function fetch() {
      setLoading(true);
      try {
        const [mintLogs, ticketLogs, voteLogs, blockNum] = await Promise.all([
          (client as NonNullable<typeof client>).getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem(
              "event CountryMinted(address indexed user, uint256 indexed countryId, uint256 amount, uint256 timestamp)"
            ),
            fromBlock: 43073285n, toBlock: "latest",
          }),
          (client as NonNullable<typeof client>).getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem(
              "event TicketPurchased(address indexed user, uint256 quantity, uint256 timestamp)"
            ),
            fromBlock: 43073285n, toBlock: "latest",
          }),
          (client as NonNullable<typeof client>).getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem(
              "event VoteCast(address indexed user, string playerName, uint256 votes, uint256 timestamp)"
            ),
            fromBlock: 43073285n, toBlock: "latest",
          }),
          (client as NonNullable<typeof client>).getBlockNumber(),
        ]);

        setLatestBlock(blockNum);

        const merged: ActivityItem[] = [
          ...mintLogs.map(l => ({
            kind: "mint" as const,
            address: l.args.user as string,
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            countryId: Number(l.args.countryId),
            amount: l.args.amount as bigint,
          })),
          ...ticketLogs.map(l => ({
            kind: "ticket" as const,
            address: l.args.user as string,
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            quantity: l.args.quantity as bigint,
          })),
          ...voteLogs.map(l => ({
            kind: "vote" as const,
            address: l.args.user as string,
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            playerName: l.args.playerName as string,
            votes: l.args.votes as bigint,
          })),
        ];

        // Sort newest first, cap at 100
        merged.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
        setItems(merged.slice(0, 100));
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }

    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [client]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-6">
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(0,82,255,0.07)",
          border: "1px solid rgba(0,82,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36,
        }}>📡</div>
        <div className="text-center space-y-2">
          <p className="text-xl font-black text-white">{t.act_connect_title}</p>
          <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.act_connect_desc}</p>
        </div>
        <button onClick={login} className="btn-neon px-8 py-3 text-sm font-bold">
          {t.connect}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            📡 {t.act_title}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#6b7a9a" }}>
            {t.act_subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="live-dot" />
          <span className="text-xs font-bold" style={{ color: "#0052FF" }}>LIVE</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {(["mint", "ticket", "vote"] as EventKind[]).map(k => {
          const { emoji, color } = kindMeta(k);
          const label = k === "mint" ? t.act_kind_mint : k === "ticket" ? t.act_kind_ticket : t.act_kind_vote;
          return (
            <div key={k} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#6b7a9a" }}>
              <span
                className="w-5 h-5 rounded-lg flex items-center justify-center text-sm"
                style={{ background: `${color}14`, border: `1px solid ${color}30` }}
              >
                {emoji}
              </span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Feed */}
      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: "#0052FF" }} />
            <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.act_loading}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-4xl">🏜️</p>
            <p className="font-bold text-white">{t.act_empty}</p>
            <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.act_empty_sub}</p>
          </div>
        ) : (
          items.map((item, i) => (
            <ActivityRow key={`${item.txHash}-${i}`} item={item} latestBlock={latestBlock} />
          ))
        )}
      </div>
    </div>
  );
}
