import { createConfig, http, fallback } from "wagmi";
import { baseSepolia } from "viem/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";

// Base Builder Code — tüm işlemleri otomatik olarak WorldPool26'ya atfeder
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_hdnr62pi"] });

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
  dataSuffix: DATA_SUFFIX,
});
