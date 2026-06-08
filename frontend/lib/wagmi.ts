import { createConfig, http } from "wagmi";
import { baseSepolia } from "viem/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "WorldPool26" }),
  ],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
  ssr: true,
});
