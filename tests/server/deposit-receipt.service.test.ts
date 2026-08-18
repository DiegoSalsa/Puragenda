import { describe, expect, it } from "vitest";
import {
  DEPOSIT_RECEIPT_MAX_BYTES,
  isAllowedDepositReceipt,
  issueDepositReceiptToken,
  verifyDepositReceiptToken,
} from "@/server/services/deposit-receipt.service";

describe("deposit receipt tokens and files", () => {
  it("issues an unguessable token that only matches its stored hash", () => {
    const first = issueDepositReceiptToken();
    const second = issueDepositReceiptToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(first.token);
    expect(verifyDepositReceiptToken(first.token, first.tokenHash)).toBe(true);
    expect(verifyDepositReceiptToken(second.token, first.tokenHash)).toBe(false);
  });

  it("only accepts supported receipt formats within the size limit", () => {
    expect(isAllowedDepositReceipt(new File(["image"], "receipt.png", { type: "image/png" }))).toBe(true);
    expect(isAllowedDepositReceipt(new File(["pdf"], "receipt.pdf", { type: "application/pdf" }))).toBe(true);
    expect(isAllowedDepositReceipt(new File(["svg"], "receipt.svg", { type: "image/svg+xml" }))).toBe(false);
    expect(isAllowedDepositReceipt(new File([new Uint8Array(DEPOSIT_RECEIPT_MAX_BYTES + 1)], "large.jpg", { type: "image/jpeg" }))).toBe(false);
  });
});
