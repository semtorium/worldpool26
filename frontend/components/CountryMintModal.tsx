"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useConnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "viem/chains";
import { Loader2, Minus, Plus, X, Zap } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, MINT_PRICE, formatEth } from "@/lib/config";
import { type Country } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";
import { MintSuccessModal } from "./MintSuccessModal";
import { TxErrorModal } from "./TxErrorModal";
import { parseWriteError } from "@/lib/parseError";
import { useEthUsd } from "@/lib/useEthUsd";

interface CountryMintModalProps {
  country: Country;
  isWinner?: boolean;
  isEliminated?: boolean;
  mintClosed?: boolean;
  openSeaUrl?: string;
  onClose: () => void;
}

function getNFTImage(id: number): string {
  return `/nfts/${id}.png`;
}

export function CountryMintModal({
  country, isWinner, isEliminated, mintClosed, openSeaUrl, onClose,
}: CountryMintModalProps) {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { connect, connectors }  = useConnect();
  const login = () => connect({ connector: connectors[0] });
  const { switchChain } = useSwitchChain();
  const isWrongChain = isConnected && walletChainId !== baseSepolia.id;
  const { t } = useLang();
  const ethUsd = useEthUsd();
  const [amount, setAmount]           = useState(1);
  const [mintedAmt, setMintedAmt]     = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  // Tracks button "Minted" state separately so we can reset it when congrats closes
  const [mintDone, setMintDone]       = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Click outside closes
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "countryTotalSupply",
    args: [BigInt(country.id)],
    query: { refetchInterval: 5_000 },
  });

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "balanceOf",
    args: address ? [address, BigInt(country.id)] : undefined,
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const { data: ethBalance } = useBalance({ address });

  const totalCost    = MINT_PRICE * BigInt(amount);
  const hasEnoughEth = !ethBalance || ethBalance.value >= totalCost;

  const { writeContract, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });

  // Aktif hata: cüzdan reddi VEYA on-chain revert
  const txError = writeError ?? receiptError ?? null;
  const isLoading = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess && txHash) {
      setShowSuccess(true);
      setMintDone(true);
    }
  }, [isSuccess, txHash]);

  // Congrats modal kapanınca: modal açık kalır, data yenilenir, buton resetlenir
  const handleSuccessClose = () => {
    setShowSuccess(false);
    setMintDone(false);
    setAmount(1);
    refetchSupply();
    refetchBalance();
  };

  const handleMint = () => {
    if (!isConnected) return;
    if (isWrongChain) {
      switchChain({ chainId: baseSepolia.id });
      return;
    }
    setMintedAmt(amount);
    writeContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "mintCountryNFT",
      args: [BigInt(country.id), BigInt(amount)],
      value: totalCost,
    });
  };

  const nftImageSrc = getNFTImage(country.id);
  const [imgLoaded, setImgLoaded] = useState(false);

  const accentColor = isWinner ? "#fbbf24" : isEliminated ? "#ef4444" : "#0052FF";

  return (
    <>
      {showSuccess && txHash && (
        <MintSuccessModal
          country={country}
          amount={mintedAmt}
          txHash={txHash}
          onClose={handleSuccessClose}
        />
      )}

      {txError && !showSuccess && (
        <TxErrorModal
          info={parseWriteError(txError)}
          onClose={resetWrite}
        />
      )}

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
          overflowY: "auto",
        }}
      >
        {/* Modal */}
        <div
          className="cmt-modal"
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            maxWidth: "780px",
            maxHeight: "90vh",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 80px rgba(0,0,0,0.6)",
            background: "#0a0e1a",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 14, right: 14, zIndex: 10,
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
          >
            <X size={15} />
          </button>

          {/* LEFT — NFT Image */}
          <div
            className="cmt-img-panel"
            style={{
              position: "relative",
              width: "42%",
              minWidth: "200px",
              flexShrink: 0,
              background: "#060914",
            }}
          >
            {/* Skeleton shimmer — visible until image loads */}
            {!imgLoaded && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 1,
                background: "linear-gradient(90deg, #0d1117 25%, #1a2235 50%, #0d1117 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }} />
            )}
            <Image
              src={nftImageSrc}
              alt={country.name}
              fill
              className="object-contain"
              unoptimized
              onLoad={() => setImgLoaded(true)}
              style={{
                opacity: imgLoaded ? (isEliminated ? 0.45 : 1) : 0,
                filter: isEliminated ? "grayscale(0.7)" : "none",
                transition: "opacity 0.3s ease",
                padding: "8px",
              }}
            />
            {/* Gradient — right edge on desktop, bottom edge on mobile */}
            <div className="cmt-img-grad-desktop" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 70%, #0a0e1a 100%)" }} />
            <div className="cmt-img-grad-mobile" style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 55%, #0a0e1a 100%)", display: "none" }} />
            {/* Winner badge */}
            {isWinner && (
              <div style={{ position: "absolute", top: 14, left: 14 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: "99px", fontSize: 11, fontWeight: 900,
                  background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.45)", color: "#fbbf24",
                }}>
                  🏆 {t.card_champion}
                </span>
              </div>
            )}
            {isEliminated && (
              <div style={{ position: "absolute", top: 14, left: 14 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: "99px", fontSize: 11, fontWeight: 900,
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444",
                }}>
                  ✕ {t.card_eliminated}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT — Info + Mint */}
          <div
            className="cmt-content"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 24px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Country name + group */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7a9a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {country.group} · {country.continent}
                </span>
              </div>
              <h2 className="font-black text-white" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", lineHeight: 1.1 }}>
                {country.name}
              </h2>
              <p style={{ fontSize: 12, color: "#6b7a9a", marginTop: 4 }}>
                {t.cmt_wc_nft}
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{
                padding: "12px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <p style={{ fontSize: 10, color: "#6b7a9a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  {t.cmt_total_minted}
                </p>
                <p className="font-black font-mono text-white" style={{ fontSize: 22 }}>
                  {totalSupply !== undefined ? totalSupply.toString() : "—"}
                </p>
              </div>
              <div style={{
                padding: "12px 14px", borderRadius: 12,
                background: address ? `rgba(0,82,255,0.04)` : "rgba(255,255,255,0.03)",
                border: `1px solid ${address ? "rgba(0,82,255,0.12)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <p style={{ fontSize: 10, color: "#6b7a9a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  {t.cmt_you_hold}
                </p>
                <p className="font-black font-mono" style={{ fontSize: 22, color: address ? "#0052FF" : "rgba(255,255,255,0.3)" }}>
                  {address ? (userBalance !== undefined ? userBalance.toString() : "—") : "—"}
                </p>
              </div>
            </div>

            {/* Prize share hint */}
            {totalSupply !== undefined && Number(totalSupply) > 0 && userBalance && Number(userBalance) > 0 && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(251,191,36,0.04)",
                border: "1px solid rgba(251,191,36,0.15)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Zap size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "rgba(251,191,36,0.8)" }}>
                  Your share if {country.name} wins:{" "}
                  <strong style={{ color: "#fbbf24" }}>
                    {((Number(userBalance) / Number(totalSupply)) * 100).toFixed(2)}%
                  </strong>
                  {" "}of prize pool
                </p>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

            {/* Mint section */}
            {isEliminated ? (
              <div style={{
                padding: "14px", borderRadius: 12, textAlign: "center",
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              }}>
                <p style={{ color: "#ef4444", fontWeight: 800, fontSize: 14 }}>✕ {t.card_eliminated}</p>
                <p style={{ color: "rgba(239,68,68,0.6)", fontSize: 12, marginTop: 4 }}>{t.cmt_eliminated_sub}</p>
              </div>
            ) : isWinner ? (
              <div style={{
                padding: "14px", borderRadius: 12, textAlign: "center",
                background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)",
              }}>
                <p style={{ color: "#fbbf24", fontWeight: 800, fontSize: 14 }}>🏆 {t.cmt_champion_title}</p>
                <p style={{ color: "rgba(251,191,36,0.6)", fontSize: 12, marginTop: 4 }}>{t.cmt_champion_sub}</p>
              </div>
            ) : mintClosed ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  padding: "12px 14px", borderRadius: 12, textAlign: "center",
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                }}>
                  <p style={{ color: "#ef4444", fontWeight: 800, fontSize: 13 }}>🔒 {t.cmt_mint_closed}</p>
                  <p style={{ color: "rgba(239,68,68,0.55)", fontSize: 11, marginTop: 3 }}>{t.cmt_mint_closed_sub}</p>
                </div>
                <a
                  href={openSeaUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px", borderRadius: 12, textDecoration: "none",
                    background: "rgba(32,129,226,0.08)", border: "1px solid rgba(32,129,226,0.3)",
                    color: "#4fa3f7", fontWeight: 800, fontSize: 13,
                  }}
                >
                  🌊 {t.cmt_opensea}
                </a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Quantity selector */}
                <div>
                  <p style={{ fontSize: 11, color: "#6b7a9a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                    {t.cmt_quantity}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => setAmount(Math.max(1, amount - 1))}
                      style={{
                        width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "white", cursor: "pointer",
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <div style={{
                      flex: 1, textAlign: "center", fontFamily: "monospace",
                      fontSize: 20, fontWeight: 900, color: "white",
                    }}>
                      {amount}
                    </div>
                    <button
                      onClick={() => setAmount(amount + 1)}
                      style={{
                        width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "white", cursor: "pointer",
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Cost */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontSize: 12, color: "#6b7a9a", fontWeight: 600 }}>{t.cmt_total_cost}</span>
                  <span className="font-black font-mono text-white" style={{ fontSize: 16 }}>
                    {formatEth(totalCost, 4)} ETH
                  </span>
                </div>

                {/* Mint button */}
                <button
                  onClick={!isConnected ? login : handleMint}
                  disabled={isLoading || (isConnected && !isWrongChain && !hasEnoughEth)}
                  className="btn-neon w-full flex items-center justify-center gap-2"
                  style={{
                    padding: "14px",
                    fontSize: 14,
                    fontWeight: 900,
                    ...(isWrongChain ? {
                      background: "rgba(251,191,36,0.12)",
                      border: "1px solid rgba(251,191,36,0.4)",
                      color: "#fbbf24",
                    } : isConnected && !hasEnoughEth ? {
                      opacity: 0.5, cursor: "not-allowed",
                      background: "rgba(255,60,60,0.12)",
                      border: "1px solid rgba(255,60,60,0.3)",
                      color: "#ff6060",
                    } : {}),
                  }}
                >
                  {isLoading
                    ? <><Loader2 size={15} className="animate-spin" />{isConfirming ? t.card_confirming : t.card_minting}</>
                    : mintDone           ? t.card_minted
                    : !isConnected       ? t.card_connect
                    : isWrongChain       ? "⚠️ Switch to Base Sepolia"
                    : !hasEnoughEth      ? t.cmt_insufficient_eth
                    : (
                      <span className="flex flex-col items-center leading-tight gap-0.5">
                        <span>{t.card_mint} · {formatEth(totalCost, 4)} ETH</span>
                        {ethUsd && (
                          <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 600 }}>
                            ≈ ${(Number(totalCost) / 1e18 * ethUsd).toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                </button>

                <p style={{ fontSize: 11, color: "rgba(107,122,154,0.6)", textAlign: "center" }}>
                  {t.cmt_price_note}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .cmt-modal {
            flex-direction: column !important;
            max-height: 92vh;
          }
          .cmt-img-panel {
            width: 100% !important;
            min-width: unset !important;
            height: 200px !important;
            flex-shrink: 0;
          }
          .cmt-img-grad-desktop { display: none !important; }
          .cmt-img-grad-mobile  { display: block !important; }
          .cmt-content {
            padding: 18px 16px 20px !important;
            gap: 14px !important;
          }
        }
      `}</style>
    </>
  );
}
