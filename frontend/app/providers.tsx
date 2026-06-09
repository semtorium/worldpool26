"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { LanguageProvider } from "@/lib/LanguageContext";
import { EthUsdProvider } from "@/lib/EthUsdContext";
import { wagmiConfig } from "@/lib/wagmi";
import { useState } from "react";

const rainbowTheme = darkTheme({
  accentColor:            "#0052FF",
  accentColorForeground:  "white",
  borderRadius:           "large",
  overlayBlur:            "small",
  fontStack:              "system",
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000, refetchInterval: 15_000 } },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <LanguageProvider>
              <EthUsdProvider>
                {children}
              </EthUsdProvider>
            </LanguageProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
