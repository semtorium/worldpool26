/**
 * useAddressUsernames
 *
 * Given a list of wallet addresses, returns a map of address → display name
 * by reading on-chain UsernameSet + UsernameVisibilityChanged events.
 *
 * Hidden usernames resolve to "" (caller should show wallet address instead).
 * Addresses with no username also resolve to "".
 */

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { fetchLogsWithCache } from "@/lib/logCache";

export function useAddressUsernames(addresses: string[]): Record<string, string> {
  const client = usePublicClient();
  const [map, setMap] = useState<Record<string, string>>({});

  // stable key so the effect only re-runs when the address list actually changes
  const addrKey = addresses
    .map(a => a.toLowerCase())
    .sort()
    .join(",");

  useEffect(() => {
    if (!client || addresses.length === 0) return;

    (async () => {
      try {
        const c = client as NonNullable<typeof client>;
        const [setLogs, hideLogs] = await Promise.allSettled([
          fetchLogsWithCache(c, "event UsernameSet(address indexed user, string name)"),
          fetchLogsWithCache(c, "event UsernameVisibilityChanged(address indexed user, bool hidden)"),
        ]);

        // Latest UsernameSet per address (logs are already block-ordered)
        const names: Record<string, string> = {};
        if (setLogs.status === "fulfilled") {
          for (const log of setLogs.value) {
            const a = (log.args.user as string).toLowerCase();
            names[a] = log.args.name as string;
          }
        }

        // Latest visibility flag per address
        const hiddenMap: Record<string, boolean> = {};
        if (hideLogs.status === "fulfilled") {
          for (const log of hideLogs.value) {
            const a = (log.args.user as string).toLowerCase();
            hiddenMap[a] = log.args.hidden as boolean;
          }
        }

        // Build result only for requested addresses
        const result: Record<string, string> = {};
        for (const addr of addresses) {
          const a = addr.toLowerCase();
          const name = names[a] ?? "";
          const hidden = hiddenMap[a] ?? false;
          result[a] = (name && !hidden) ? name : "";
        }
        setMap(result);
      } catch {
        // silent fail — caller gracefully falls back to shortened address
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, addrKey]);

  return map;
}
