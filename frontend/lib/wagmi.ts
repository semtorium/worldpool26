import { createConfig, http, fallback } from "wagmi";
import { baseSepolia } from "viem/chains";
import { Attribution } from "ox/erc8021";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  phantomWallet,
  walletConnectWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";

// Base Builder Code — tüm işlemleri otomatik olarak WorldPool26'ya atfeder
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_hdnr62pi"] });

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

// WalletConnect gerektiren wallet'lar → sadece projectId varsa göster
const mobileWallets = PROJECT_ID
  ? [{ groupName: "Mobil", wallets: [rainbowWallet, trustWallet, phantomWallet, walletConnectWallet] }]
  : [];

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popüler",
      wallets: [injectedWallet, metaMaskWallet, coinbaseWallet, rabbyWallet],
    },
    ...mobileWallets,
  ],
  { appName: "WorldPool26", projectId: PROJECT_ID || "placeholder" },
);

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
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
