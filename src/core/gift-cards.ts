export type GiftCardTemplateSnapshot = {
  name: string;
  description: string | null;
  type: "BALANCE" | "SERVICE";
  salePrice: number;
  faceValue: number | null;
  currencyCode: string;
  designPreset: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  imageUrl: string | null;
  shortMessage: string | null;
  services: Array<{ serviceId: string; serviceName: string; servicePrice: number; quantity: number }>;
};

export function asMoney(value: unknown) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function quoteBalanceGiftCard(remainingBalance: number, totalDue: number) {
  return Math.max(0, Math.min(Math.floor(remainingBalance), Math.floor(totalDue)));
}

export function quoteServiceGiftCard(input: {
  services: Array<{ id: string; basePrice: number }>;
  entitlements: Array<{ serviceId: string | null; quantityRemaining: number }>;
  totalDue: number;
}) {
  const available = new Map(
    input.entitlements
      .filter((item): item is { serviceId: string; quantityRemaining: number } => Boolean(item.serviceId))
      .map((item) => [item.serviceId, item.quantityRemaining]),
  );
  const coveredServices: Array<{ serviceId: string; amountCovered: number }> = [];
  let amountCovered = 0;

  for (const service of input.services) {
    if ((available.get(service.id) ?? 0) < 1) continue;
    const amount = Math.max(0, Math.floor(service.basePrice));
    if (amount === 0) continue;
    coveredServices.push({ serviceId: service.id, amountCovered: amount });
    available.set(service.id, (available.get(service.id) ?? 0) - 1);
    amountCovered += amount;
  }

  return {
    amountCovered: Math.min(Math.max(0, Math.floor(input.totalDue)), amountCovered),
    coveredServices,
  };
}

export function isGiftCardDepleted(input: {
  type: "BALANCE" | "SERVICE";
  remainingBalance: number | null;
  entitlements?: Array<{ quantityRemaining: number }>;
}) {
  return input.type === "BALANCE"
    ? (input.remainingBalance ?? 0) <= 0
    : (input.entitlements ?? []).every((item) => item.quantityRemaining <= 0);
}
