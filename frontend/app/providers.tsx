"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { WagmiProvider } from "wagmi";
import { LanguageProvider } from "@/lib/LanguageContext";
import { EthUsdProvider } from "@/lib/EthUsdContext";
import { wagmiConfig } from "@/lib/wagmi";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000, refetchInterval: 15_000 } },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <EthUsdProvider>
              {children}
            </EthUsdProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
