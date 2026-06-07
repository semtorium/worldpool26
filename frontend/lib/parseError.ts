export interface TxErrorInfo {
  title: string;   // Kısa başlık
  detail: string;  // Kullanıcıya gösterilen mesaj
  code: string;    // Teknik hata kodu (monospace kutuda gösterilir)
}

/**
 * wagmi / viem WriteContractError veya TransactionReceiptError'ı
 * parse ederek kullanıcı dostu TxErrorInfo'ya dönüştürür.
 */
export function parseWriteError(error: unknown): TxErrorInfo {
  if (!error) return { title: "Bilinmeyen hata", detail: "", code: "" };

  const e = error as any;
  const errName    = e?.name        ?? "";
  const rawMessage = e?.message     ?? String(error);

  // ── 1. Kullanıcı cüzdanda reddetti ──────────────────────────────────────
  const isRejected =
    e?.code === 4001 ||
    errName === "UserRejectedRequestError" ||
    e?.cause?.name === "UserRejectedRequestError" ||
    rawMessage.toLowerCase().includes("user rejected") ||
    rawMessage.toLowerCase().includes("user denied");

  if (isRejected) {
    return {
      title: "İşlem reddedildi",
      detail: "Cüzdanda işlem onaylanmadı.",
      code: "USER_REJECTED_REQUEST",
    };
  }

  // ── 2. Sözleşme require/revert nedeni (cause zincirini tara) ────────────
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
      title: "Sözleşme hatası",
      detail: reason,
      code: e?.shortMessage ?? errName ?? "CONTRACT_REVERT",
    };
  }

  // ── 3. Yetersiz bakiye ───────────────────────────────────────────────────
  if (
    rawMessage.toLowerCase().includes("insufficient funds") ||
    rawMessage.toLowerCase().includes("exceeds balance")
  ) {
    return {
      title: "Yetersiz bakiye",
      detail: "İşlem için yeterli ETH yok.",
      code: "INSUFFICIENT_FUNDS",
    };
  }

  // ── 4. viem shortMessage (en okunabilir özet) ───────────────────────────
  if (e?.shortMessage) {
    return {
      title: "İşlem başarısız",
      detail: e.shortMessage,
      code: errName || "UNKNOWN",
    };
  }

  // ── 5. Genel fallback ────────────────────────────────────────────────────
  const firstLine = rawMessage.split("\n")[0].slice(0, 220);
  return {
    title: "İşlem başarısız",
    detail: firstLine || "Bilinmeyen bir hata oluştu.",
    code: errName || "UNKNOWN",
  };
}
