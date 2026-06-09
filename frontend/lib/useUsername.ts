/**
 * useUsername — on-chain username for the CONNECTED wallet.
 *
 * Source of truth: contract mappings `usernames` + `usernameHidden`.
 * localStorage is used as an optimistic display cache so the UI updates
 * instantly without waiting for the next RPC poll.
 *
 * Keys:
 *   wp26_uname_<addr>   — cached username  (""  = skipped/no name)
 *   wp26_hidden_<addr>  — "true" if hidden  (absent = visible)
 *   wp26_prompted_<addr>— "1" once the modal has been shown at least once
 */

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";

const unameKey    = (addr: string) => `wp26_uname_${addr.toLowerCase()}`;
const hiddenKey   = (addr: string) => `wp26_hidden_${addr.toLowerCase()}`;
const promptedKey = (addr: string) => `wp26_prompted_${addr.toLowerCase()}`;

export { promptedKey };

export function useUsername(address?: string) {
  const addr = address?.toLowerCase();

  // ── On-chain reads ────────────────────────────────────────────
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

  // ── Local optimistic state (initialised from localStorage) ────
  const [localName,   setLocalName]   = useState<string>("");
  const [localHidden, setLocalHidden] = useState<boolean>(false);

  useEffect(() => {
    if (!addr) { setLocalName(""); setLocalHidden(false); return; }
    setLocalName(localStorage.getItem(unameKey(addr)) ?? "");
    setLocalHidden(localStorage.getItem(hiddenKey(addr)) === "true");
  }, [addr]);

  // ── Sync on-chain → localStorage when contract data arrives ──
  useEffect(() => {
    if (!addr) return;
    const name = (onChainName as string) ?? "";
    if (name) {
      localStorage.setItem(unameKey(addr), name);
      setLocalName(name);
    }
  }, [onChainName, addr]);

  useEffect(() => {
    if (!addr) return;
    const hidden = !!(onChainHidden as boolean);
    localStorage.setItem(hiddenKey(addr), hidden ? "true" : "false");
    setLocalHidden(hidden);
  }, [onChainHidden, addr]);

  // ── Helpers called AFTER a successful tx to update local cache ─
  const saveUsername = (name: string) => {
    if (!addr) return;
    localStorage.setItem(unameKey(addr), name.trim());
    localStorage.setItem(promptedKey(addr), "1");
    setLocalName(name.trim());
    // auto-unhide
    localStorage.setItem(hiddenKey(addr), "false");
    setLocalHidden(false);
  };

  const saveHidden = (hidden: boolean) => {
    if (!addr) return;
    localStorage.setItem(hiddenKey(addr), hidden ? "true" : "false");
    setLocalHidden(hidden);
  };

  const markPrompted = () => {
    if (!addr) return;
    localStorage.setItem(promptedKey(addr), "1");
    // also store "" so old code path (wp26_uname_) also considers it prompted
    if (!localStorage.getItem(unameKey(addr))) {
      localStorage.setItem(unameKey(addr), "");
    }
  };

  // Prefer on-chain data; fall back to local cache while RPC loads
  const rawUsername = ((onChainName as string) || localName) ?? "";
  const isHidden    = (onChainHidden !== undefined ? !!(onChainHidden as boolean) : localHidden);

  // displayName is "" when hidden (others should show the wallet address instead)
  const username = isHidden ? "" : rawUsername;

  const wasPrompted = !!addr && (
    !!localStorage.getItem(promptedKey(addr)) ||
    localStorage.getItem(unameKey(addr)) !== null
  );

  return { username, rawUsername, isHidden, saveUsername, saveHidden, markPrompted, wasPrompted };
}
