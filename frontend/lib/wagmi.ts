import { createConfig, http, fallback } from "wagmi";
import { baseSepolia } from "viem/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "WorldPool26" }),
  ],
  transports: {
    [baseSepolia.id]: fallback([
      http("https://sepolia.base.org"),
      http("https://base-sepolia-rpc.publicnode.com"),
      http("https://84532.rpc.thirdweb.com"),
    ]),
  },
  ssr: true,
});
