// Public payment instructions approved by PUROCODE. These are not API credentials.
export const MANUAL_TRANSFER_ACCOUNT = {
  holder: "PUROCODE SPA",
  taxId: "784141039",
  bank: "Mercado Pago",
  accountType: "Cuenta Vista",
  accountNumber: "1035754777",
  email: "contacto@purocode.com",
} as const;

export function manualTransferReference(businessName: string, slug: string) {
  return `${businessName} / ${slug}`;
}

export function manualTransferReceiptUrl(reference: string) {
  return `mailto:${MANUAL_TRANSFER_ACCOUNT.email}?subject=${encodeURIComponent(`Comprobante de renovación Puragenda · ${reference}`)}`;
}
