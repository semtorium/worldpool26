"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, createWalletClient, custom, http, fallback, type Address } from "viem";
import { base } from "viem/chains";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { TOP_SCORER_PLAYERS, EXTRA_ADMIN_WALLETS } from "@/lib/config";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

// Session key — includes contract address so re-deploy resets verification
const ADMIN_VERIFIED_KEY = `abs_admin_verified_${CONTRACT_ADDRESS}`;

// ── Viem clients ──────────────────────────────────────────────
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY ?? "";
const publicClient = createPublicClient({
  chain: base,
  transport: fallback([
    http(ALCHEMY_KEY ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : "", { batch: true }),
    http("https://mainnet.base.org"),
    http("https://rpc.ankr.com/base"),
  ].filter(t => t) as any),
});

function fmt(wei: bigint | undefined) {
  if (!wei === undefined || wei === undefined) return "0.0000";
  return (Number(wei) / 1e18).toFixed(4);
}

// ── EIP-6963 wallet discovery ─────────────────────────────────
interface EIP6963ProviderInfo { uuid: string; name: string; icon: string; rdns: string; }
interface EIP6963ProviderDetail { info: EIP6963ProviderInfo; provider: any; }

function useWalletDiscovery() {
  const [wallets, setWallets] = useState<EIP6963ProviderDetail[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<EIP6963ProviderDetail>).detail;
      setWallets(prev =>
        prev.find(w => w.info.uuid === detail.info.uuid) ? prev : [...prev, detail]
      );
    };
    window.addEventListener("eip6963:announceProvider", handler as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", handler as EventListener);
  }, []);

  return wallets;
}

// ── Stat card ─────────────────────────────────────────────────
function Stat({ label, value, sub, color = "#0052FF" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px" }}>
      <p style={{ color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{label}</p>
      <p style={{ color, fontSize: 22, fontWeight: 900, fontFamily: "monospace" }}>{value}</p>
      {sub && <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function AdminPage() {
  const discoveredWallets = useWalletDiscovery();

  const [address, setAddress]           = useState<Address | null>(null);
  const [provider, setProvider]         = useState<any>(null);
  const [showPicker, setShowPicker]     = useState(false);
  const [ownerAddress, setOwnerAddress] = useState<Address | null>(null);
  const [chainId, setChainId]           = useState<number | null>(null);

  // Contract state
  const [totalPool,      setTotalPool]      = useState<bigint>(0n);
  const [ncPool,         setNcPool]         = useState<bigint>(0n);
  const [scorerPool,     setScorerPool]     = useState<bigint>(0n);
  const [totalVol,       setTotalVol]       = useState<bigint>(0n);
  const [allSupplies,    setAllSupplies]    = useState<bigint[]>([]);
  const [ncFinalized,    setNcFinalized]    = useState(false);
  const [tsFinalized,    setTsFinalized]    = useState(false);
  const [winningId,      setWinningId]      = useState<bigint>(0n);
  const [finalScorer,    setFinalScorer]    = useState("");
  const [isMintClosed,   setIsMintClosed]   = useState(false);
  const [isVotingClosed, setIsVotingClosed] = useState(false);
  const [isPaused,       setIsPaused]       = useState(false);
  const [isMaintenance,  setIsMaintenance]  = useState(false);
  const [elimStatus,     setElimStatus]     = useState<boolean[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [ncFinalizedAt,  setNcFinalizedAt]  = useState<bigint>(0n);
  const [tsFinalizedAt,  setTsFinalizedAt]  = useState<bigint>(0n);

  // Elimination state — no winner assignment needed in v6
  const [elimLoserIds, setElimLoserIds] = useState<number[]>([]);

  // Signature verification gate
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isVerifying,     setIsVerifying]     = useState(false);

  // Pending dev balance
  const [pendingDev, setPendingDev] = useState<bigint>(0n);

  // Mint end time
  const [mintEndTimeVal,   setMintEndTimeVal]   = useState<bigint>(0n);
  const [mintEndTimeInput, setMintEndTimeInput] = useState("");

  // Username ban
  const [banInput,  setBanInput]  = useState("");
  const [banStatus, setBanStatus] = useState<"idle"|"checking"|"banned"|"done"|"error">("idle");
  const [banMessage, setBanMessage] = useState("");

  // Tx state
  const [ncWinnerId,    setNcWinnerId]    = useState("");
  const [tsPlayer,      setTsPlayer]      = useState("");
  const [tsCustomInput, setTsCustomInput] = useState("");
  const [txPending,     setTxPending]     = useState<string | null>(null);
  const [txSuccess,     setTxSuccess]     = useState<string | null>(null);
  const [txError,       setTxError]       = useState<string | null>(null);

  // Restore verified state from sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_VERIFIED_KEY) === "true") {
      setIsAdminVerified(true);
    }
  }, []);

  // ── Fetch contract data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tp, ncp, sp, tv, ncF, tsF, wId, fs, owner, mintClosed, votingClosed, paused, maint, elim, ncAt, tsAt, pendDev, mintET] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalLockedPrizePool" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "nationsCupPoolBalance" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerPoolBalance" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalGlobalVolumeETH" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "owner" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "mintClosed" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "votingClosed" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "paused" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "maintenanceMode" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllEliminationStatus" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "nationsCupFinalizedAt" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalizedAt" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "pendingDevBalance" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "mintEndTime" }),
      ]);

      setTotalPool(tp as bigint);
      setNcPool(ncp as bigint);
      setScorerPool(sp as bigint);
      setTotalVol(tv as bigint);
      setNcFinalized(ncF as boolean);
      setTsFinalized(tsF as boolean);
      setWinningId(wId as bigint);
      setFinalScorer(fs as string);
      setOwnerAddress((owner as string).toLowerCase() as Address);
      setIsMintClosed(mintClosed as boolean);
      setIsVotingClosed(votingClosed as boolean);
      setIsPaused(paused as boolean);
      setIsMaintenance(maint as boolean);
      setElimStatus(Array.from(elim as unknown as boolean[]));
      setNcFinalizedAt(ncAt as bigint);
      setTsFinalizedAt(tsAt as bigint);
      setPendingDev(pendDev as bigint);
      const et = mintET as bigint;
      setMintEndTimeVal(et);
      // Pre-fill input with current value if set
      if (et > 0n) {
        const d = new Date(Number(et) * 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        setMintEndTimeInput(
          `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        );
      }

      // Fetch supplies for active countries
      const supplies = await Promise.all(
        COUNTRIES.map(c =>
          publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "countryTotalSupply", args: [BigInt(c.id)] })
        )
      );
      setAllSupplies(supplies as bigint[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Connect wallet via EIP-6963 ──
  const connectWallet = async (walletProvider: any) => {
    try {
      const accounts = await walletProvider.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0].toLowerCase() as Address);
      setProvider(walletProvider);
      setShowPicker(false);
      // Read current chain
      const cid = await walletProvider.request({ method: "eth_chainId" });
      setChainId(parseInt(cid, 16));
      // Keep chainId in sync when user switches in wallet
      walletProvider.on?.("chainChanged", (hex: string) => setChainId(parseInt(hex, 16)));
    } catch (e) {
      console.error("Connect error", e);
    }
  };

  // ── Switch to Base Mainnet if needed ──
  const ensureChain = async () => {
    const CHAIN_HEX = "0x2105"; // 8453 decimal
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_HEX }],
      });
    } catch (err: any) {
      // 4902 = chain not yet added in wallet
      if (err?.code === 4902 || err?.code === -32603) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_HEX,
            chainName: "Base",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          }],
        });
      } else {
        throw err;
      }
    }
  };

  // ── Signature verification gate ──
  // Owner signs a time-windowed message to prove key ownership.
  // Gasless (signMessage, not a TX). Stored in sessionStorage until tab closes.
  const handleVerifySignature = async () => {
    if (!provider || !address || !ownerAddress) return;
    setIsVerifying(true);
    try {
      // 10-minute time window — prevents replay from old signatures
      const timeWindow = Math.floor(Date.now() / (10 * 60 * 1000));
      const message    = `WorldPool26 Admin Panel\nContract: ${CONTRACT_ADDRESS}\nWindow: ${timeWindow}`;
      const walletClient = createWalletClient({ account: address, chain: base, transport: custom(provider) });
      const signature    = await walletClient.signMessage({ account: address, message });
      const valid        = await publicClient.verifyMessage({ address: ownerAddress, message, signature });
      if (valid) {
        sessionStorage.setItem(ADMIN_VERIFIED_KEY, "true");
        setIsAdminVerified(true);
      } else {
        alert("Signature does not match owner address.");
      }
    } catch (e: any) {
      if (e?.code !== 4001) console.error(e); // 4001 = user rejected, not an error
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Send tx ──
  const sendTx = async (fnName: string, args: unknown[], label: string) => {
    if (!provider || !address) return;
    setTxPending(label); setTxSuccess(null); setTxError(null);
    try {
      await ensureChain();
      const walletClient = createWalletClient({ account: address, chain: base, transport: custom(provider) });
      const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI as any, functionName: fnName, args });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxSuccess(label);
      await fetchData();
    } catch (e: any) {
      setTxError(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setTxPending(null);
    }
  };

  // Owner veya EXTRA_ADMIN_WALLETS listesindeki cüzdanlar panele erişebilir.
  // Not: Sadece owner cüzdanı TX gönderebilir (contract onlyOwner modifier).
  const isOwner      = address && ownerAddress && address === ownerAddress;
  const isAuthorized = isOwner || (!!address && EXTRA_ADMIN_WALLETS.map(w => w.toLowerCase()).includes(address.toLowerCase()));

  // ── Active countries (has supply) ──
  const activeCountries = COUNTRIES
    .map((c, i) => ({ ...c, supply: allSupplies[i] ?? 0n }))
    .filter(c => c.supply > 0n)
    .sort((a, b) => (b.supply > a.supply ? 1 : -1));

  // ── Math preview for NC finalize ──
  const previewId      = ncWinnerId ? Number(ncWinnerId) : null;
  const previewCountry = previewId ? COUNTRIES.find(c => c.id === previewId) : null;
  const previewSupply  = previewId ? (allSupplies[COUNTRIES.findIndex(c => c.id === previewId)] ?? 0n) : 0n;
  const previewPayout  = previewSupply > 0n ? (Number(ncPool) * 0.95) / Number(previewSupply) / 1e18 : 0;

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: 13, outline: "none", width: "100%",
  };
  const sectionStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px",
  };

  // ── Wallet Picker ──
  const WalletPicker = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(6,9,20,0.88)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ color: "#fff", fontSize: 16, fontWeight: 900, marginBottom: 6 }}>Select Wallet</p>

        {discoveredWallets.length === 0 && (
          <p style={{ color: "#6b7a9a", fontSize: 13 }}>No wallets detected. Install MetaMask or Rabby.</p>
        )}

        {discoveredWallets.map(w => (
          <button key={w.info.uuid} onClick={() => connectWallet(w.provider)}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            {w.info.icon
              ? <img src={w.info.icon} width={24} height={24} style={{ borderRadius: 6 }} alt={w.info.name} />
              : <span style={{ fontSize: 20 }}>🔐</span>
            }
            {w.info.name}
          </button>
        ))}

        <button onClick={() => setShowPicker(false)} style={{ background: "transparent", border: "none", color: "#6b7a9a", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Not connected ──
  if (!address) return (
    <div style={{ background: "#060914", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {showPicker && <WalletPicker />}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>Admin Panel</p>
        <p style={{ color: "#6b7a9a", fontSize: 14 }}>Connect your owner wallet</p>
        <button onClick={() => setShowPicker(true)}
          style={{ background: "linear-gradient(135deg,#0052FF,#00cc6a)", color: "#060914", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
          Connect Wallet
        </button>
      </div>
    </div>
  );

  // ── Not authorized — show generic 404, don't reveal admin panel exists ──
  if (address && ownerAddress && !isAuthorized) return (
    <div style={{ background: "#060914", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <p style={{ color: "rgba(255,255,255,0.08)", fontSize: 120, fontWeight: 900, lineHeight: 1, margin: 0 }}>404</p>
        <p style={{ color: "#6b7a9a", fontSize: 16 }}>Page not found</p>
        <Link href="/" style={{ color: "#0052FF", fontWeight: 700, textDecoration: "none", fontSize: 13, marginTop: 8 }}>← Back to site</Link>
      </div>
    </div>
  );

  // ── Authorized but not verified — require wallet signature ──
  if (address && isAuthorized && !isAdminVerified) return (
    <div style={{ background: "#060914", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 360, padding: "0 24px" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(0,82,255,0.08)", border: "1px solid rgba(0,82,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={36} style={{ color: "#0052FF" }} />
        </div>
        <p style={{ color: "#fff", fontSize: 20, fontWeight: 900, margin: 0 }}>Verify Ownership</p>
        <p style={{ color: "#6b7a9a", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Sign a message with your owner wallet to access the admin panel. This is gasless — no transaction required.
        </p>
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontFamily: "monospace" }}>
          {address.slice(0,6)}...{address.slice(-4)}
        </p>
        <button
          onClick={handleVerifySignature}
          disabled={isVerifying}
          style={{ background: "linear-gradient(135deg,#0052FF,#00cc6a)", color: "#060914", border: "none", borderRadius: 14, padding: "14px 32px", fontWeight: 900, fontSize: 14, cursor: isVerifying ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: isVerifying ? 0.7 : 1 }}>
          {isVerifying && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          {isVerifying ? "Waiting for signature…" : "🔑 Sign to Continue"}
        </button>
        <button onClick={() => { setAddress(null); setProvider(null); setShowPicker(true); }}
          style={{ background: "transparent", border: "none", color: "#6b7a9a", fontSize: 12, cursor: "pointer" }}>
          Switch wallet
        </button>
      </div>
    </div>
  );

  // ── Admin Panel ──
  return (
    <div style={{ background: "#060914", minHeight: "100vh", color: "#f0f4ff" }}>
      {showPicker && <WalletPicker />}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <Link href="/" style={{ color: "#6b7a9a", fontSize: 12, textDecoration: "none" }}>← Back to site</Link>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 6 }}>🛠️ Admin Panel</h1>
            <p style={{ fontSize: 12, color: "#6b7a9a", marginTop: 2 }}>
              {address?.slice(0,6)}...{address?.slice(-4)} · Base
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setAddress(null); setProvider(null); setShowPicker(true); }}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#6b7a9a", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Switch Wallet
            </button>
            <button onClick={fetchData} disabled={loading}
              style={{ background: "rgba(0,82,255,0.08)", border: "1px solid rgba(0,82,255,0.2)", borderRadius: 10, padding: "8px 16px", color: "#0052FF", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "↻"} Refresh
            </button>
          </div>
        </div>

        {/* Read-only warning for extra admin wallets */}
        {!isOwner && isAuthorized && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12 }}>
            <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>👁️ Read-Only Mode</p>
            <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 2 }}>Bu cüzdan admin listesinde ama owner değil. Tüm verileri görebilirsin, işlem atmaya çalışırsan revert olur.</p>
          </div>
        )}

        {/* Wrong chain warning */}
        {chainId !== null && chainId !== 8453 && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>⚠️ Wrong Network — connected to chain {chainId}</p>
              <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 2 }}>Transactions will automatically switch to Base when you click any action button.</p>
            </div>
            <button
              onClick={async () => { try { await ensureChain(); const cid = await provider.request({ method: "eth_chainId" }); setChainId(parseInt(cid, 16)); } catch {} }}
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "8px 14px", color: "#fbbf24", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              Switch Now
            </button>
          </div>
        )}

        {/* Tx feedback */}
        {txSuccess && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(0,82,255,0.08)", border: "1px solid rgba(0,82,255,0.25)", borderRadius: 12, color: "#0052FF", fontWeight: 700, fontSize: 13 }}>
            ✓ {txSuccess} — transaction confirmed!
          </div>
        )}
        {txError && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.25)", borderRadius: 12, color: "#ff6060", fontSize: 13 }}>
            ✗ {txError}
          </div>
        )}

        {/* Live Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          <Stat label="Total Prize Pool"  value={`${fmt(totalPool)} ETH`}  color="#fbbf24" />
          <Stat label="Nations Cup Pool"  value={`${fmt(ncPool)} ETH`}     color="#0052FF" />
          <Stat label="Top Scorer Pool"   value={`${fmt(scorerPool)} ETH`} color="#2563EB" />
          <Stat label="Total Volume"      value={`${fmt(totalVol)} ETH`}   color="#0052FF" />
          <Stat label="Nations Cup"       value={ncFinalized ? "✓ Finalized" : "Active"} color={ncFinalized ? "#0052FF" : "#fbbf24"} sub={ncFinalized ? `Winner: #${winningId.toString()}` : undefined} />
          <Stat label="Top Scorer"        value={tsFinalized ? "✓ Finalized" : "Active"} color={tsFinalized ? "#0052FF" : "#fbbf24"} sub={tsFinalized ? finalScorer : undefined} />
          <Stat label="Mint Status"        value={isMintClosed ? "🔒 CLOSED" : "🟢 OPEN"} color={isMintClosed ? "#ef4444" : "#0052FF"} />
          <Stat label="Vote Status"        value={isVotingClosed ? "🔒 CLOSED" : "🟢 OPEN"} color={isVotingClosed ? "#ef4444" : "#0052FF"} />
          <Stat label="Contract Status"   value={isPaused ? "⏸ PAUSED" : "▶ Running"} color={isPaused ? "#ef4444" : "#0052FF"} />
          <Stat label="Site Maintenance"  value={isMaintenance ? "🔧 ON" : "✓ OFF"} color={isMaintenance ? "#fbbf24" : "#0052FF"} />
          <Stat label="Eliminated"        value={`${elimStatus.filter(Boolean).length} / 48`} color="#6b7a9a" />
          <Stat label="Pending Dev Fees"  value={`${fmt(pendingDev)} ETH`} color={pendingDev > 0n ? "#ef4444" : "#6b7a9a"} sub={pendingDev > 0n ? "Failed transfers — withdraw below" : "All fees delivered"} />
        </div>

        {/* Mint Control */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: isMintClosed ? "rgba(239,68,68,0.4)" : "rgba(0,82,255,0.3)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>🎟️ Mint Control</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Closing mint prevents new NFTs from being minted. Ticket purchases and votes remain open.
          </p>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "20px 24px", borderRadius: 14,
            background: isMintClosed ? "rgba(239,68,68,0.07)" : "rgba(0,82,255,0.05)",
            border: `1px solid ${isMintClosed ? "rgba(239,68,68,0.35)" : "rgba(0,82,255,0.25)"}`,
          }}>
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                background: isMintClosed ? "rgba(239,68,68,0.12)" : "rgba(0,82,255,0.1)",
              }}>
                {isMintClosed ? "🔒" : "🟢"}
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>
                  {isMintClosed ? "Mint CLOSED" : "Mint OPEN"}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 3 }}>
                  {isMintClosed
                    ? "Users cannot mint NFTs · Tickets & votes remain open · Trading open"
                    : "Users can freely mint country NFTs"}
                </p>
              </div>
            </div>
            <button
              disabled={txPending === "mintToggle"}
              onClick={() => sendTx("setMintClosed", [!isMintClosed], "mintToggle")}
              style={{
                background: isMintClosed
                  ? "linear-gradient(135deg,#0052FF,#00cc6a)"
                  : "linear-gradient(135deg,#ef4444,#dc2626)",
                color: isMintClosed ? "#060914" : "#fff",
                border: "none", borderRadius: 12, padding: "12px 24px",
                fontWeight: 900, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}>
              {txPending === "mintToggle" && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {txPending === "mintToggle" ? "Confirming…" : isMintClosed ? "✓ Open Mint" : "🔒 Close Mint"}
            </button>
          </div>
        </div>

        {/* Mint Deadline */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: mintEndTimeVal > 0n ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.07)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⏰ Mint Deadline</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Opsiyonel. Belirtilen tarih/saatten sonra mint işlemi kontrat seviyesinde bloklanır. Sıfırla = süresiz açık.
          </p>

          {/* Current value */}
          <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16,
            background: mintEndTimeVal > 0n ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${mintEndTimeVal > 0n ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)"}` }}>
            {mintEndTimeVal === 0n ? (
              <p style={{ color: "#6b7a9a", fontSize: 13 }}>🟢 Deadline ayarlanmamış — mint süresiz açık</p>
            ) : (
              <div>
                <p style={{ color: "#fbbf24", fontWeight: 800, fontSize: 13 }}>
                  ⏰ Deadline: {new Date(Number(mintEndTimeVal) * 1000).toLocaleString("tr-TR")}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 3 }}>
                  {Date.now() / 1000 > Number(mintEndTimeVal)
                    ? "🔒 Deadline geçti — mint kapalı (kontrat engelliyor)"
                    : `⏳ ${Math.ceil((Number(mintEndTimeVal) - Date.now()/1000) / 3600)} saat kaldı`}
                </p>
              </div>
            )}
          </div>

          {/* Input + buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="datetime-local"
              value={mintEndTimeInput}
              onChange={e => setMintEndTimeInput(e.target.value)}
              style={{ ...inputStyle, maxWidth: 240, colorScheme: "dark" }}
            />
            <button
              disabled={!mintEndTimeInput || txPending === "setMintEnd"}
              onClick={() => {
                const ts = BigInt(Math.floor(new Date(mintEndTimeInput).getTime() / 1000));
                sendTx("setMintEndTime", [ts], "setMintEnd");
              }}
              style={{
                background: mintEndTimeInput ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "rgba(255,255,255,0.05)",
                color: mintEndTimeInput ? "#060914" : "#4a5568",
                border: "none", borderRadius: 12, padding: "10px 20px",
                fontWeight: 800, fontSize: 13,
                cursor: mintEndTimeInput ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}>
              {txPending === "setMintEnd" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              {txPending === "setMintEnd" ? "Confirming…" : "⏰ Set Deadline"}
            </button>
            {mintEndTimeVal > 0n && (
              <button
                disabled={txPending === "clearMintEnd"}
                onClick={() => { setMintEndTimeInput(""); sendTx("setMintEndTime", [0n], "clearMintEnd"); }}
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 20px", color: "#ef4444", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                {txPending === "clearMintEnd" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {txPending === "clearMintEnd" ? "Confirming…" : "✕ Sıfırla"}
              </button>
            )}
          </div>
        </div>

        {/* Username Ban */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: "rgba(239,68,68,0.25)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>🚫 Username Ban</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Bir username'i yasakla — on-chain kaydedilir, o isim bir daha kimse tarafından kullanılamaz. Case-sensitive.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Username to ban…"
              maxLength={32}
              value={banInput}
              onChange={e => { setBanInput(e.target.value); setBanStatus("idle"); setBanMessage(""); }}
              style={{ ...inputStyle, maxWidth: 220 }}
            />
            <button
              disabled={!banInput.trim() || txPending === "banUsername"}
              onClick={async () => {
                const name = banInput.trim();
                if (!name) return;
                setBanStatus("checking");
                setBanMessage("");
                // Check if already banned
                try {
                  const already = await publicClient.readContract({
                    address: CONTRACT_ADDRESS, abi: ABI,
                    functionName: "isUsernameBanned", args: [name],
                  });
                  if (already) {
                    setBanStatus("banned");
                    setBanMessage(`"${name}" zaten yasak listesinde.`);
                    return;
                  }
                } catch { /* ignore */ }
                // Send ban TX
                try {
                  await sendTx("banUsername", [name], "banUsername");
                  setBanStatus("done");
                  setBanMessage(`"${name}" başarıyla yasaklandı.`);
                  setBanInput("");
                } catch {
                  setBanStatus("error");
                  setBanMessage("TX başarısız.");
                }
              }}
              style={{
                background: banInput.trim() ? "linear-gradient(135deg,#ef4444,#dc2626)" : "rgba(255,255,255,0.05)",
                color: banInput.trim() ? "#fff" : "#4a5568",
                border: "none", borderRadius: 12, padding: "10px 20px",
                fontWeight: 800, fontSize: 13,
                cursor: banInput.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}>
              {txPending === "banUsername" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              🚫 Ban this username
            </button>
          </div>

          {/* Status message */}
          {banMessage && (
            <p style={{
              fontSize: 12, fontWeight: 700, marginTop: 6,
              color: banStatus === "done" ? "#22c55e" : banStatus === "banned" ? "#fbbf24" : "#ef4444",
            }}>
              {banStatus === "done" ? "✓" : banStatus === "banned" ? "⚠" : "✕"} {banMessage}
            </p>
          )}
        </div>

        {/* Vote Control */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: isVotingClosed ? "rgba(239,68,68,0.4)" : "rgba(37,99,235,0.3)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⚽ Top Scorer Vote Control</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Closing votes stops ticket purchases and voting. Auto-closes when Top Scorer is finalized. NFT minting remains open.
          </p>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "20px 24px", borderRadius: 14,
            background: isVotingClosed ? "rgba(239,68,68,0.07)" : "rgba(37,99,235,0.05)",
            border: `1px solid ${isVotingClosed ? "rgba(239,68,68,0.35)" : "rgba(37,99,235,0.25)"}`,
          }}>
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                background: isVotingClosed ? "rgba(239,68,68,0.12)" : "rgba(37,99,235,0.1)",
              }}>
                {isVotingClosed ? "🔒" : "🟢"}
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>
                  {isVotingClosed ? "Voting CLOSED" : "Voting OPEN"}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 3 }}>
                  {isVotingClosed
                    ? "Ticket purchases and votes are disabled · Auto-set when Top Scorer finalized"
                    : "Users can buy tickets and vote for Top Scorer"}
                </p>
              </div>
            </div>
            <button
              disabled={txPending === "voteToggle" || tsFinalized}
              onClick={() => sendTx("setVotingClosed", [!isVotingClosed], "voteToggle")}
              style={{
                background: tsFinalized
                  ? "rgba(255,255,255,0.05)"
                  : isVotingClosed
                    ? "linear-gradient(135deg,#0052FF,#00cc6a)"
                    : "linear-gradient(135deg,#ef4444,#dc2626)",
                color: tsFinalized ? "#4a5568" : isVotingClosed ? "#060914" : "#fff",
                border: "none", borderRadius: 12, padding: "12px 24px",
                fontWeight: 900, fontSize: 14,
                cursor: tsFinalized ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}>
              {txPending === "voteToggle" && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {txPending === "voteToggle"
                ? "Confirming…"
                : tsFinalized
                  ? "🔒 Auto-closed (Finalized)"
                  : isVotingClosed ? "✓ Open Voting" : "🔒 Close Voting"}
            </button>
          </div>
        </div>

        {/* Active Countries */}
        <div style={{ ...sectionStyle, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 16 }}>⚽ Active Countries ({activeCountries.length})</h2>
          {activeCountries.length === 0 ? (
            <p style={{ color: "#6b7a9a", fontSize: 13 }}>No mints yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["ID", "Country", "NFTs Minted"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCountries.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px 12px", color: "#6b7a9a" }}>#{c.id}</td>
                      <td style={{ padding: "8px 12px", color: "#fff", fontWeight: 700 }}>{c.name}</td>
                      <td style={{ padding: "8px 12px", color: "#0052FF", fontWeight: 700 }}>{c.supply.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Finalize Nations Cup */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: ncFinalized ? "rgba(0,82,255,0.15)" : "rgba(251,191,36,0.15)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>🏆 Finalize Nations Cup</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: !ncFinalized && !isMintClosed ? 10 : 16 }}>Declare the winning country — irreversible.</p>
          {/* Front-run guard: warn if mint is still open */}
          {!ncFinalized && !isMintClosed && (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.35)", fontSize: 12, color: "#ef4444", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚠️</span>
              <span><strong>Mint must be closed before finalizing.</strong> Close mint first (above) to prevent front-running. The contract enforces this.</span>
            </div>
          )}
          {ncFinalized ? (
            <div style={{ padding: "12px 16px", background: "rgba(0,82,255,0.06)", borderRadius: 12, border: "1px solid rgba(0,82,255,0.2)" }}>
              <p style={{ color: "#0052FF", fontWeight: 700 }}>✓ Finalized — Winner: Country #{winningId.toString()}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={ncWinnerId} onChange={e => setNcWinnerId(e.target.value)} style={{ ...inputStyle, maxWidth: 320, colorScheme: "dark" }}>
                  <option value="" style={{ background: "#0d1117", color: "#6b7a9a" }}>— Select winning country —</option>
                  {COUNTRIES
                    .map((c, i) => ({ ...c, supply: allSupplies[i] ?? 0n }))
                    .sort((a, b) => (b.supply > a.supply ? 1 : -1))
                    .map(c => (
                      <option key={c.id} value={c.id} style={{ background: "#0d1117", color: c.supply > 0n ? "#fff" : "#9ca3af" }}>
                        {c.supply === 0n ? "⚠️ " : ""}{c.name} (#{c.id}) — {c.supply.toString()} NFTs
                      </option>
                    ))
                  }
                </select>
                {ncWinnerId && allSupplies[COUNTRIES.findIndex(c => c.id === Number(ncWinnerId))] === 0n && (
                  <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.07)", borderRadius: 10, border: "1px solid rgba(251,191,36,0.25)", fontSize: 12, color: "#fbbf24" }}>
                    ⚠️ This country has 0 NFTs minted — nobody will be able to claim rewards.
                  </div>
                )}
                <button
                  disabled={!ncWinnerId || txPending === "finalizeNC"}
                  onClick={() => sendTx("finalizeNationsCup", [BigInt(ncWinnerId)], "finalizeNC")}
                  style={{ background: !ncWinnerId ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#0052FF,#00cc6a)", color: !ncWinnerId ? "#4a5568" : "#060914", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: !ncWinnerId ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {txPending === "finalizeNC" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  {txPending === "finalizeNC" ? "Confirming…" : `Finalize → ${previewCountry?.name ?? "..."}`}
                </button>
              </div>
              {previewCountry && previewSupply > 0n && (
                <div style={{ padding: "14px 16px", background: "rgba(251,191,36,0.05)", borderRadius: 12, border: "1px solid rgba(251,191,36,0.15)", fontSize: 13 }}>
                  <p style={{ color: "#fbbf24", fontWeight: 800, marginBottom: 8 }}>📊 Math Preview — {previewCountry.name}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>MAIN NC POOL</p><p style={{ color: "#fff", fontWeight: 700, fontFamily: "monospace" }}>{(Number(ncPool)/1e18).toFixed(4)} ETH</p></div>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>WINNER NFTs</p><p style={{ color: "#fff", fontWeight: 700 }}>{previewSupply.toString()}</p></div>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>PAYOUT/NFT (95%)</p><p style={{ color: "#0052FF", fontWeight: 900, fontFamily: "monospace" }}>{previewPayout.toFixed(5)} ETH</p></div>
                  </div>
                  <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 8 }}>
                    ({(Number(ncPool)/1e18).toFixed(4)} × 0.95) ÷ {previewSupply.toString()} = {previewPayout.toFixed(6)} ETH per NFT
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Finalize Top Scorer */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: tsFinalized ? "rgba(0,82,255,0.15)" : "rgba(0,82,255,0.2)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⚽ Finalize Top Scorer</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>Player name must exactly match what users voted for.</p>
          {tsFinalized ? (
            <div style={{ padding: "12px 16px", background: "rgba(0,82,255,0.06)", borderRadius: 12, border: "1px solid rgba(0,82,255,0.2)" }}>
              <p style={{ color: "#0052FF", fontWeight: 700 }}>✓ Finalized — {finalScorer}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={tsPlayer}
                  onChange={e => { setTsPlayer(e.target.value); setTsCustomInput(""); }}
                  style={{ ...inputStyle, maxWidth: 300, colorScheme: "dark" }}
                >
                  <option value="" style={{ background: "#0d1117", color: "#6b7a9a" }}>— Select top scorer —</option>
                  {TOP_SCORER_PLAYERS.map(p => (
                    <option key={p.name} value={p.name} style={{ background: "#0d1117", color: "#fff" }}>{p.name} ({p.country})</option>
                  ))}
                  <option value="__other__" style={{ background: "#0d1117", color: "#fbbf24" }}>✏️ Other (not in list)…</option>
                </select>
              </div>

              {tsPlayer === "__other__" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    value={tsCustomInput}
                    onChange={e => setTsCustomInput(e.target.value)}
                    placeholder="Enter exact player name…"
                    style={{ ...inputStyle, maxWidth: 300 }}
                  />
                  <div style={{ padding: "12px 16px", background: "rgba(251,191,36,0.06)", borderRadius: 12, border: "1px solid rgba(251,191,36,0.2)", fontSize: 12 }}>
                    <p style={{ color: "#fbbf24", fontWeight: 700, marginBottom: 4 }}>⚠️ No votes on record for this player</p>
                    <p style={{ color: "#6b7a9a" }}>Nobody voted for this player — no one will be able to claim. The top scorer pool will remain in the contract and can be recovered via <strong style={{ color: "#b0bcd4" }}>Withdraw Unclaimed Top Scorer</strong> after 30 days.</p>
                  </div>
                </div>
              )}

              {(() => {
                const finalName = tsPlayer === "__other__" ? tsCustomInput.trim() : tsPlayer;
                const knownPlayer = TOP_SCORER_PLAYERS.find(p => p.name === tsPlayer);
                if (!finalName) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tsPlayer !== "__other__" && (
                      <div style={{ padding: "12px 16px", background: "rgba(0,82,255,0.06)", borderRadius: 12, border: "1px solid rgba(0,82,255,0.2)", fontSize: 13 }}>
                        <p style={{ color: "#a78bfa", fontWeight: 800 }}>
                          ⚽ Selected: <span style={{ color: "#fff" }}>{finalName}</span>
                          <span style={{ color: "#6b7a9a", fontWeight: 400 }}> — {knownPlayer?.country}</span>
                        </p>
                        <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 6 }}>
                          This exact string will be stored on-chain. Users who voted for "{finalName}" will be eligible to claim.
                        </p>
                      </div>
                    )}
                    <div>
                      <button
                        disabled={txPending === "finalizeTS"}
                        onClick={() => sendTx("finalizeTopScorer", [finalName], "finalizeTS")}
                        style={{ background: "linear-gradient(135deg,#2563EB,#6d28d9)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        {txPending === "finalizeTS" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                        {txPending === "finalizeTS" ? "Confirming…" : `Finalize → ${finalName}`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Eliminate Countries */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: "rgba(239,68,68,0.2)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⛔ Eliminate Countries</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Tıklayarak seç, tekrar tıklayarak kaldır. Seçim tamamlanınca tek TX ile gönder.<br />
            <span style={{ color: "#fbbf24" }}>Sarı = seçili (eleneceK) · Kırmızı = zaten elenmiş</span>
          </p>

          {!ncFinalized ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Country grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {COUNTRIES.map(c => {
                  const alreadyElim = elimStatus[c.id];
                  const isSelected  = elimLoserIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      disabled={!!alreadyElim}
                      onClick={() => {
                        if (alreadyElim) return;
                        setElimLoserIds(prev =>
                          prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        gap: 4, padding: "10px 8px", borderRadius: 12, cursor: alreadyElim ? "default" : "pointer",
                        fontWeight: 700, fontSize: 12, lineHeight: 1.3, textAlign: "center",
                        transition: "all 0.12s",
                        border: isSelected
                          ? "1.5px solid rgba(251,191,36,0.7)"
                          : alreadyElim
                            ? "1.5px solid rgba(239,68,68,0.3)"
                            : "1.5px solid rgba(255,255,255,0.08)",
                        background: isSelected
                          ? "rgba(251,191,36,0.12)"
                          : alreadyElim
                            ? "rgba(239,68,68,0.07)"
                            : "rgba(255,255,255,0.03)",
                        color: isSelected
                          ? "#fbbf24"
                          : alreadyElim
                            ? "#ef4444"
                            : "rgba(255,255,255,0.55)",
                        opacity: alreadyElim ? 0.6 : 1,
                        boxShadow: isSelected ? "0 0 12px rgba(251,191,36,0.15)" : "none",
                      }}
                    >
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>#{c.id}</span>
                      <span>{c.name}</span>
                      {isSelected   && <span style={{ fontSize: 14 }}>✓</span>}
                      {alreadyElim  && <span style={{ fontSize: 12 }}>⛔</span>}
                    </button>
                  );
                })}
              </div>

              {/* Selection summary + actions */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", borderRadius: 14, flexWrap: "wrap", gap: 12,
                background: elimLoserIds.length > 0 ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${elimLoserIds.length > 0 ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)"}`,
              }}>
                <div>
                  {elimLoserIds.length === 0 ? (
                    <p style={{ color: "#6b7a9a", fontSize: 13 }}>Henüz ülke seçilmedi — yukarıdan tıkla</p>
                  ) : (
                    <>
                      <p style={{ color: "#fbbf24", fontWeight: 800, fontSize: 14 }}>
                        {elimLoserIds.length} ülke seçildi
                      </p>
                      <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 2 }}>
                        {elimLoserIds.map(id => COUNTRIES.find(c => c.id === id)?.name).join(", ")}
                      </p>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {elimLoserIds.length > 0 && (
                    <button
                      onClick={() => setElimLoserIds([])}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#6b7a9a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Temizle
                    </button>
                  )}
                  <button
                    disabled={elimLoserIds.length === 0 || txPending === "eliminate"}
                    onClick={() => {
                      sendTx("eliminateCountries", [elimLoserIds.map(BigInt)], "eliminate")
                        .then(() => setElimLoserIds([]));
                    }}
                    style={{
                      background: elimLoserIds.length === 0
                        ? "rgba(255,255,255,0.05)"
                        : "linear-gradient(135deg,#ef4444,#dc2626)",
                      color: elimLoserIds.length === 0 ? "#4a5568" : "#fff",
                      border: "none", borderRadius: 12, padding: "10px 20px",
                      fontWeight: 800, fontSize: 13,
                      cursor: elimLoserIds.length === 0 ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                    }}
                  >
                    {txPending === "eliminate" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                    {txPending === "eliminate"
                      ? "Confirming…"
                      : elimLoserIds.length === 0
                        ? "Ülke seç"
                        : `⛔ ${elimLoserIds.length} Ülkeyi Ele`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Already finalized — show eliminated list read-only */
            <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Eliminated ({elimStatus.filter(Boolean).length})
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COUNTRIES.filter(c => elimStatus[c.id]).map(c => (
                  <span key={c.id} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "3px 10px", color: "#ff6060", fontSize: 12, fontWeight: 700 }}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Withdraw Unclaimed Pools */}
        {(() => {
          const FIFTEEN_DAYS = 15 * 24 * 60 * 60; // seconds
          const nowSec = Math.floor(Date.now() / 1000);

          const ncUnlockAt  = ncFinalizedAt > 0n ? Number(ncFinalizedAt) + FIFTEEN_DAYS : null;
          const tsUnlockAt  = tsFinalizedAt > 0n ? Number(tsFinalizedAt) + FIFTEEN_DAYS : null;

          const ncUnlocked  = ncUnlockAt !== null && nowSec >= ncUnlockAt;
          const tsUnlocked  = tsUnlockAt !== null && nowSec >= tsUnlockAt;

          const fmtCountdown = (unlockAt: number) => {
            const diff = unlockAt - nowSec;
            if (diff <= 0) return null;
            const d = Math.floor(diff / 86400);
            const h = Math.floor((diff % 86400) / 3600);
            const m = Math.floor((diff % 3600) / 60);
            return `${d}d ${h}h ${m}m remaining`;
          };

          return (
            <div style={{ ...sectionStyle, marginBottom: 24, borderColor: "rgba(0,82,255,0.15)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>💰 Withdraw Unclaimed Pools</h2>
              <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 20 }}>
                After 15 days from finalization, any ETH not claimed by winners can be withdrawn to the owner wallet.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Nations Cup */}
                {true && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "16px 20px", borderRadius: 14,
                    background: ncUnlocked ? "rgba(0,82,255,0.05)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${ncUnlocked ? "rgba(0,82,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    <div>
                      <p style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>🏆 Nations Cup Unclaimed</p>
                      <p style={{ color: "#fbbf24", fontWeight: 700, fontFamily: "monospace", fontSize: 15, marginTop: 4 }}>
                        {fmt(ncPool)} ETH remaining in pool
                      </p>
                      {!ncFinalized && (
                        <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 4 }}>
                          ⏳ Not finalized yet — countdown starts after finalization
                        </p>
                      )}
                      {ncFinalized && !ncUnlocked && ncUnlockAt && (
                        <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 4 }}>
                          🔒 {fmtCountdown(ncUnlockAt)}
                        </p>
                      )}
                      {ncFinalized && ncUnlocked && (
                        <p style={{ color: "#0052FF", fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                          ✓ Unlock period passed — ready to withdraw
                        </p>
                      )}
                    </div>
                    <button
                      disabled={!ncUnlocked || Number(ncPool) === 0 || txPending === "withdrawNC"}
                      onClick={() => sendTx("withdrawUnclaimedNationsCup", [], "withdrawNC")}
                      style={{
                        background: ncUnlocked && Number(ncPool) > 0
                          ? "linear-gradient(135deg,#0052FF,#00cc6a)"
                          : "rgba(255,255,255,0.05)",
                        color: ncUnlocked && Number(ncPool) > 0 ? "#060914" : "#4a5568",
                        border: "none", borderRadius: 12, padding: "10px 20px",
                        fontWeight: 800, fontSize: 13,
                        cursor: ncUnlocked && Number(ncPool) > 0 ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                      }}
                    >
                      {txPending === "withdrawNC" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                      {txPending === "withdrawNC" ? "Confirming…" : "Withdraw NC"}
                    </button>
                  </div>
                )}

                {/* Top Scorer */}
                {true && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "16px 20px", borderRadius: 14,
                    background: tsUnlocked ? "rgba(0,82,255,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${tsUnlocked ? "rgba(0,82,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    <div>
                      <p style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>⚽ Top Scorer Unclaimed</p>
                      <p style={{ color: "#a78bfa", fontWeight: 700, fontFamily: "monospace", fontSize: 15, marginTop: 4 }}>
                        {fmt(scorerPool)} ETH remaining in pool
                      </p>
                      {!tsFinalized && (
                        <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 4 }}>
                          ⏳ Not finalized yet — countdown starts after finalization
                        </p>
                      )}
                      {tsFinalized && !tsUnlocked && tsUnlockAt && (
                        <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 4 }}>
                          🔒 {fmtCountdown(tsUnlockAt)}
                        </p>
                      )}
                      {tsFinalized && tsUnlocked && (
                        <p style={{ color: "#0052FF", fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                          ✓ Unlock period passed — ready to withdraw
                        </p>
                      )}
                    </div>
                    <button
                      disabled={!tsUnlocked || Number(scorerPool) === 0 || txPending === "withdrawTS"}
                      onClick={() => sendTx("withdrawUnclaimedTopScorer", [], "withdrawTS")}
                      style={{
                        background: tsUnlocked && Number(scorerPool) > 0
                          ? "linear-gradient(135deg,#2563EB,#6d28d9)"
                          : "rgba(255,255,255,0.05)",
                        color: tsUnlocked && Number(scorerPool) > 0 ? "#fff" : "#4a5568",
                        border: "none", borderRadius: 12, padding: "10px 20px",
                        fontWeight: 800, fontSize: 13,
                        cursor: tsUnlocked && Number(scorerPool) > 0 ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                      }}
                    >
                      {txPending === "withdrawTS" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                      {txPending === "withdrawTS" ? "Confirming…" : "Withdraw TS"}
                    </button>
                  </div>
                )}

              </div>
            </div>
          );
        })()}

        {/* Withdraw Pending Dev Fees */}
        {pendingDev > 0n && (
          <div style={{ ...sectionStyle, marginBottom: 24, borderColor: "rgba(239,68,68,0.4)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>⚠️ Pending Dev Fees</h2>
            <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
              Some dev fee transfers failed (devWallet was temporarily unreachable). These ETH are safely stored in the contract. Withdraw them now.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 14, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.3)", gap: 12 }}>
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Accumulated Pending</p>
                <p style={{ color: "#ef4444", fontWeight: 900, fontFamily: "monospace", fontSize: 18, marginTop: 4 }}>{fmt(pendingDev)} ETH</p>
              </div>
              <button
                disabled={txPending === "withdrawPendingDev"}
                onClick={() => sendTx("withdrawPendingDev", [], "withdrawPendingDev")}
                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                {txPending === "withdrawPendingDev" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {txPending === "withdrawPendingDev" ? "Confirming…" : "Withdraw to devWallet"}
              </button>
            </div>
          </div>
        )}

        {/* Contract Config */}
        <div style={{ ...sectionStyle, borderColor: "rgba(239,68,68,0.15)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⚙️ Contract Config</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 20 }}>Emergency controls. To open or close minting, use the <strong style={{ color: "#f0f4ff" }}>Mint Control</strong> section above.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Maintenance Mode */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderRadius: 14, background: isMaintenance ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${isMaintenance ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.08)"}` }}>
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {isMaintenance ? "🔧 Maintenance Mode ON" : "✓ Site Normal"}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 3 }}>
                  {isMaintenance ? "All visitors see the maintenance overlay." : "Site is visible to everyone normally."}
                </p>
              </div>
              <button
                disabled={txPending === "maintenance"}
                onClick={() => sendTx("setMaintenanceMode", [!isMaintenance], "maintenance")}
                style={{
                  background: isMaintenance ? "linear-gradient(135deg,#0052FF,#00cc6a)" : "linear-gradient(135deg,#fbbf24,#f59e0b)",
                  color: "#060914",
                  border: "none", borderRadius: 12, padding: "10px 20px",
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                }}>
                {txPending === "maintenance" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {txPending === "maintenance" ? "Confirming…" : isMaintenance ? "Turn Off Maintenance" : "Enter Maintenance"}
              </button>
            </div>

            {/* Pause / Unpause */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderRadius: 14, background: isPaused ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${isPaused ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}` }}>
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {isPaused ? "⏸ Contract Paused" : "▶ Contract Running"}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 3 }}>
                  {isPaused ? "Mint, ticket purchase and voting are disabled." : "All user actions are enabled."}
                </p>
              </div>
              <button
                disabled={txPending === "pause"}
                onClick={() => sendTx("setPaused", [!isPaused], "pause")}
                style={{
                  background: isPaused ? "linear-gradient(135deg,#0052FF,#00cc6a)" : "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: isPaused ? "#060914" : "#fff",
                  border: "none", borderRadius: 12, padding: "10px 20px",
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                }}>
                {txPending === "pause" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {txPending === "pause" ? "Confirming…" : isPaused ? "Unpause Contract" : "Pause Contract"}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
