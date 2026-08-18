import crypto from "crypto";

export const DEPOSIT_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const DEPOSIT_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function issueDepositReceiptToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashDepositReceiptToken(token) };
}

export function hashDepositReceiptToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyDepositReceiptToken(token: string, expectedHash: string) {
  const actual = Buffer.from(hashDepositReceiptToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function isAllowedDepositReceipt(file: File) {
  return DEPOSIT_RECEIPT_MIME_TYPES.has(file.type) && file.size > 0 && file.size <= DEPOSIT_RECEIPT_MAX_BYTES;
}
