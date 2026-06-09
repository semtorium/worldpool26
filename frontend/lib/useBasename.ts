import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { base, mainnet } from "viem/chains";

// Base L2 Universal Resolver (resolves .base.eth names)
const BASE_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as `0x${string}`;

// Lazy-init clients (only in browser)
let mainnetClient: ReturnType<typeof createPublicClient> | null = null;
let baseClient:    ReturnType<typeof createPublicClient> | null = null;

function getClients() {
  if (!mainnetClient) mainnetClient = createPublicClient({ chain: mainnet, transport: http() });
  if (!baseClient)    baseClient    = createPublicClient({ chain: base,    transport: http() });
  return { mainnetClient, baseClient };
}

export function useBasename(address?: `0x${string}`) {
  const [name, setName]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) { setName(null); return; }
    setLoading(true);

    const { mainnetClient: mc, baseClient: bc } = getClients();

    // Try Basename (Base L2) first, fall back to mainnet ENS
    Promise.allSettled([
      bc.getEnsName({ address, universalResolverAddress: BASE_RESOLVER }),
      mc.getEnsName({ address }),
    ]).then(([bn, ens]) => {
      const basename = bn.status === "fulfilled" ? bn.value : null;
      const ensname  = ens.status === "fulfilled" ? ens.value : null;
      setName(basename ?? ensname ?? null);
    }).finally(() => setLoading(false));
  }, [address]);

  return { name, loading };
}
