/**
 * useUsername — on-chain username for the CONNECTED wallet.
 *
 * Source of truth: contract mappings `usernames` + `usernameHidden`.
 * localStorage is used as an optimistic display cache so the UI updates
 * instantly without waiting for the next RPC poll.
 *
 * Keys:
 *   wp26_uname_<addr>    — cached username  (""  = skipped/no name)
 *   wp26_hidden_<addr>   — "true" if hidden  (absent = visible)
 *   wp26_prompted_<addr> — "1" once the modal has been shown at least once
 *
 * IMPORTANT: localName / localHidden are read DIRECTLY from localStorage on
 * every render (synchronous read, ~0 cost). This avoids the stale-state bug
 * where a useState value from the previous address lingers for one render
 * cycle after the address changes. Optimistic overrides (post-tx) are stored
 * in a state object keyed to the current addr so they auto-invalidate on
 * wallet switch.
 */

import { useState, useEffect, useRef } from "react";
import { useReadContract } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";

const unameKey    = (addr: string) => `wp26_uname_${addr.toLowerCase()}`;
const hiddenKey   = (addr: string) => `wp26_hidden_${addr.toLowerCase()}`;
const promptedKey = (addr: string) => `wp26_prompted_${addr.toLowerCase()}`;

export { promptedKey };

interface Optimistic {
  addr:   string;
  name:   string;
  hidden: boolean;
}

export function useUsername(address?: string) {
  const addr = address?.toLowerCase();

  // ── On-chain reads ─────────────────────────────────────────────
  const { data: onChainName } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "usernames",
    args: addr ? [addr as `0x${string}`] : undefined,
    query: { enabled: !!addr, refetchInterval: 15_000 },
  });

  const { data: onChainHidden } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "usernameHidden",
    args: addr ? [addr as `0x${string}`] : undefined,
    query: { enabled: !!addr, refetchInterval: 15_000 },
  });

  // ── Optimistic state (post-tx fast update, keyed to current addr) ──
  // Automatically invalid when addr changes — no stale data from prev wallet.
  const [optimistic, setOptimistic] = useState<Optimistic | null>(null);
  const currentOptimistic = optimistic?.addr === addr ? optimistic : null;

  // ── Sync on-chain → localStorage (side-effect only, no state) ──
  const prevOnChainRef = useRef<{ name?: unknown; hidden?: unknown }>({});
  useEffect(() => {
    if (!addr) return;
    const name   = (onChainName   as string)  ?? "";
    const hidden = !!(onChainHidden as boolean);

    // Only write when the value actually changed to avoid thrashing
    if (onChainName !== prevOnChainRef.current.name) {
      if (name) localStorage.setItem(unameKey(addr), name);
      prevOnChainRef.current.name = onChainName;
    }
    if (onChainHidden !== prevOnChainRef.current.hidden) {
      localStorage.setItem(hiddenKey(addr), hidden ? "true" : "false");
      prevOnChainRef.current.hidden = onChainHidden;
    }
  }, [onChainName, onChainHidden, addr]);

  // Reset prev-ref when addr changes so the next on-chain value always writes
  useEffect(() => {
    prevOnChainRef.current = {};
  }, [addr]);

  // ── Synchronous localStorage reads (always correct for current addr) ──
  const lsName   = addr ? (localStorage.getItem(unameKey(addr))   ?? "") : "";
  const lsHidden = addr ? (localStorage.getItem(hiddenKey(addr)) === "true") : false;

  // ── Helpers called AFTER a successful tx ───────────────────────
  const saveUsername = (name: string) => {
    if (!addr) return;
    const trimmed = name.trim();
    localStorage.setItem(unameKey(addr),    trimmed);
    localStorage.setItem(promptedKey(addr), "1");
    localStorage.setItem(hiddenKey(addr),   "false");
    setOptimistic({ addr, name: trimmed, hidden: false });
  };

  const saveHidden = (hidden: boolean) => {
    if (!addr) return;
    localStorage.setItem(hiddenKey(addr), hidden ? "true" : "false");
    // Preserve existing optimistic name, or fall back to what we know
    const existingName = currentOptimistic?.name ?? (onChainName as string) ?? lsName;
    setOptimistic({ addr, name: existingName, hidden });
  };

  const markPrompted = () => {
    if (!addr) return;
    localStorage.setItem(promptedKey(addr), "1");
    if (!localStorage.getItem(unameKey(addr))) {
      localStorage.setItem(unameKey(addr), "");
    }
  };

  // ── Derived display values ─────────────────────────────────────
  // Priority: optimistic (post-tx) > on-chain > localStorage cache
  const rawUsername = currentOptimistic?.name
    ?? (onChainName as string | undefined)
    ?? lsName;

  const isHidden = currentOptimistic !== null
    ? currentOptimistic.hidden
    : onChainHidden !== undefined
      ? !!(onChainHidden as boolean)
      : lsHidden;

  // Empty string when hidden so callers can fall back to shortened address
  const username = isHidden ? "" : (rawUsername ?? "");

  const wasPrompted = !!addr && (
    !!localStorage.getItem(promptedKey(addr)) ||
    localStorage.getItem(unameKey(addr)) !== null
  );

  return { username, rawUsername: rawUsername ?? "", isHidden, saveUsername, saveHidden, markPrompted, wasPrompted };
}
