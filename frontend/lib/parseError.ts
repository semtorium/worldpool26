import type { TranslationKey } from "./i18n";

export interface TxErrorInfo {
  titleKey: TranslationKey; // i18n key — TxErrorModal resolves translation
  detail: string;           // Raw error detail (contract message, stays as-is)
  code: string;             // Technical error code shown in monospace box
}

/**
 * wagmi / viem WriteContractError or TransactionReceiptError →
 * parsed into a TxErrorInfo with an i18n title key.
 */
export function parseWriteError(error: unknown): TxErrorInfo {
  if (!error) return { titleKey: "err_unknown", detail: "", code: "" };

  const e = error as any;
  const errName    = e?.name        ?? "";
  const rawMessage = e?.message     ?? String(error);

  // ── 1. User rejected in wallet ──────────────────────────────────────────
  const isRejected =
    e?.code === 4001 ||
    errName === "UserRejectedRequestError" ||
    e?.cause?.name === "UserRejectedRequestError" ||
    rawMessage.toLowerCase().includes("user rejected") ||
    rawMessage.toLowerCase().includes("user denied");

  if (isRejected) {
    return {
      titleKey: "err_rejected",
      detail: "The transaction was not approved in your wallet.",
      code: "USER_REJECTED_REQUEST",
    };
  }

  // ── 2. Contract require/revert reason (walk cause chain) ────────────────
  function findReason(err: any, depth = 0): string | null {
    if (!err || depth > 7) return null;
    if (typeof err.reason === "string"          && err.reason)          return err.reason;
    if (typeof err.data?.errorName === "string" && err.data.errorName)  return err.data.errorName;
    if (typeof err.data?.message   === "string" && err.data.message)    return err.data.message;
    return findReason(err.cause, depth + 1);
  }

  const reason = findReason(e);
  if (reason) {
    return {
      titleKey: "err_contract",
      detail: reason,
      code: e?.shortMessage ?? errName ?? "CONTRACT_REVERT",
    };
  }

  // ── 3. Insufficient funds ────────────────────────────────────────────────
  if (
    rawMessage.toLowerCase().includes("insufficient funds") ||
    rawMessage.toLowerCase().includes("exceeds balance")
  ) {
    return {
      titleKey: "err_insufficient",
      detail: "Not enough ETH to complete the transaction.",
      code: "INSUFFICIENT_FUNDS",
    };
  }

  // ── 4. viem shortMessage (most readable summary) ─────────────────────────
  if (e?.shortMessage) {
    return {
      titleKey: "err_failed",
      detail: e.shortMessage,
      code: errName || "UNKNOWN",
    };
  }

  // ── 5. Generic fallback ──────────────────────────────────────────────────
  const firstLine = rawMessage.split("\n")[0].slice(0, 220);
  return {
    titleKey: "err_failed",
    detail: firstLine || "An unknown error occurred.",
    code: errName || "UNKNOWN",
  };
}
