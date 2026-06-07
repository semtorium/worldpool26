"use client";

import { createContext, useContext, useState, useEffect } from "react";

const EthUsdContext = createContext<number | null>(null);

async function fetchEthPrice(): Promise<number | null> {
  // Primary: CoinGecko
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    const json = await res.json();
    if (json?.ethereum?.usd) return json.ethereum.usd;
  } catch { /* fallthrough to backup */ }

  // Fallback: Binance
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    const json = await res.json();
    if (json?.price) return parseFloat(json.price);
  } catch { /* silent */ }

  return null;
}

export function EthUsdProvider({ children }: { children: React.ReactNode }) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const p = await fetchEthPrice();
      // Only update if we got a valid price — keep last known on failure
      if (!cancelled && p !== null) setPrice(p);
    };

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <EthUsdContext.Provider value={price}>
      {children}
    </EthUsdContext.Provider>
  );
}

export function useEthUsd(): number | null {
  return useContext(EthUsdContext);
}
