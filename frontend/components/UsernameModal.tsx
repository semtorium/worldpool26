"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, User, X } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { useBasename } from "@/lib/useBasename";
import { useUsername } from "@/lib/useUsername";
import { useLang } from "@/lib/LanguageContext";

interface Props {
  address: `0x${string}`;
  onDone: () => void;
}

export function UsernameModal({ address, onDone }: Props) {
  const { name: basename, loading: bnLoading } = useBasename(address);
  const { saveUsername, markPrompted }          = useUsername(address);
  const { t } = useLang();

  const [input, setInput]         = useState("");
  const [error, setError]         = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  // ── On-chain checks (lazy — triggered on Apply) ───────────────
  const [checkName, setCheckName] = useState<string | undefined>(undefined);

  const { data: isBanned, isFetching: isBanFetching } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "isUsernameBanned",
    args: checkName ? [checkName] : undefined,
    query: { enabled: !!checkName },
  });

  const { data: isTaken, isFetching: isTakenFetching } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "isUsernameTaken",
    args: checkName ? [checkName] : undefined,
    query: { enabled: !!checkName },
  });

  // ── Write: setUsername ────────────────────────────────────────
  const { writeContract, data: txHash, isPending: isWalletPending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const isBusy = isWalletPending || isConfirming || isBanFetching || isTakenFetching;

  // Auto-fill from Basename/ENS when resolved
  useEffect(() => {
    if (basename && !prefilled) {
      setInput(basename);
      setPrefilled(true);
    }
  }, [basename, prefilled]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // When checks resolve, proceed or show error
  useEffect(() => {
    if (!checkName || isBanFetching || isTakenFetching) return;
    if (isBanned) {
      setError(t.unm_err_banned);
      setCheckName(undefined);
      return;
    }
    if (isTaken) {
      setError(t.unm_err_taken);
      setCheckName(undefined);
      return;
    }
    // All clear — send tx
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "setUsername",
      args: [checkName],
    });
    setCheckName(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBanned, isTaken, isBanFetching, isTakenFetching]);

  // On tx success — save to localStorage + close
  useEffect(() => {
    if (!isTxSuccess || !txHash) return;
    const name = input.trim();
    saveUsername(name);
    onDone();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTxSuccess]);

  const handleApply = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      // Empty = skip; mark as prompted so modal doesn't re-appear
      markPrompted();
      onDone();
      return;
    }
    setError("");
    resetWrite();
    setCheckName(trimmed);
  };

  const handleSkip = () => {
    markPrompted();
    onDone();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter")  handleApply();
    if (e.key === "Escape") handleSkip();
  };

  // Status label inside Apply button
  const btnLabel = isWalletPending
    ? t.unm_waiting_wallet
    : isConfirming
      ? t.unm_confirming_tx
      : (isBanFetching || isTakenFetching)
        ? t.unm_checking
        : t.unm_apply;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) handleSkip(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5 relative"
        style={{
          background: "linear-gradient(160deg,#0a0f24 0%,#070c1d 100%)",
          border: "1px solid rgba(0,82,255,0.25)",
          boxShadow: "0 0 60px rgba(0,82,255,0.12), 0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: "#6b7a9a" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6b7a9a")}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg,rgba(0,82,255,0.25),rgba(37,99,235,0.15))",
              border: "1px solid rgba(0,82,255,0.3)",
            }}
          >
            <User size={18} style={{ color: "#60A5FA" }} />
          </div>
          <div>
            <h2 className="font-black text-white text-base leading-tight">{t.unm_title}</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a9a" }}>
              {t.unm_subtitle}
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl relative"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
              transition: "border-color 0.15s",
            }}
          >
            {bnLoading && (
              <Loader2 size={14} className="animate-spin shrink-0" style={{ color: "#6b7a9a" }} />
            )}
            <input
              ref={inputRef}
              type="text"
              maxLength={32}
              value={input}
              onChange={e => { setInput(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder={t.unm_placeholder}
              className="flex-1 bg-transparent border-none outline-none text-white font-semibold text-sm placeholder:text-[#3d4a63]"
            />
            {input && (
              <button
                onClick={() => { setInput(""); setError(""); inputRef.current?.focus(); }}
                className="shrink-0 text-xs font-bold"
                style={{ color: "#6b7a9a" }}
              >✕</button>
            )}
          </div>

          {error && (
            <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>⚠ {error}</p>
          )}

          {basename && !bnLoading && (
            <p className="text-xs" style={{ color: "rgba(96,165,250,0.7)" }}>
              {t.unm_basename.split("{name}")[0]}
              <span className="font-bold text-blue-400">{basename}</span>
              {t.unm_basename.split("{name}")[1]}
            </p>
          )}

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            {t.unm_hint}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            disabled={isBusy}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#6b7a9a",
              opacity: isBusy ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!isBusy) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
          >
            {t.unm_skip}
          </button>
          <button
            onClick={handleApply}
            disabled={isBusy}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2"
            style={{
              background: input.trim() ? "linear-gradient(135deg,#0052FF,#2563EB)" : "rgba(0,82,255,0.15)",
              border: "1px solid rgba(0,82,255,0.4)",
              color: input.trim() ? "#fff" : "rgba(255,255,255,0.3)",
              boxShadow: input.trim() ? "0 0 20px rgba(0,82,255,0.25)" : "none",
              opacity: isBusy ? 0.7 : 1,
            }}
          >
            {isBusy && <Loader2 size={14} className="animate-spin" />}
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
