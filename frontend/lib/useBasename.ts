import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { base, mainnet } from "viem/chains";

// Base L2 Universal Resolver (resolves .base.eth names)
const BASE_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as `0x${string}`;

// Module-level clients — safe to create at import time (just config, no network calls yet)
const mainnetClient = createPublicClient({ chain: mainnet, transport: http() });
const baseClient    = createPublicClient({ chain: base,    transport: http() });

export function useBasename(address?: `0x${string}`) {
  const [name, setName]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) { setName(null); return; }
    setLoading(true);

    // Try Basename (.base.eth via Base L2) first, fall back to mainnet ENS
    Promise.allSettled([
      baseClient.getEnsName({ address, universalResolverAddress: BASE_RESOLVER }),
      mainnetClient.getEnsName({ address }),
    ]).then(([bn, ens]) => {
      const basename = bn.status === "fulfilled" ? bn.value : null;
      const ensname  = ens.status === "fulfilled" ? ens.value : null;
      setName(basename ?? ensname ?? null);
    }).finally(() => setLoading(false));
  }, [address]);

  return { name, loading };
}
