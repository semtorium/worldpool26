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
    // Ankr public endpoint — supports larger eth_getLogs block ranges than
    // the official https://sepolia.base.org (which caps at ~2 000 blocks).
    [baseSepolia.id]: http("https://rpc.ankr.com/base_sepolia"),
  },
  ssr: true,
});
