import crypto from "crypto";

export type LocalPaymentKind = "subscription" | "deposit";

export interface LocalPaymentPayload {
  kind: LocalPaymentKind;
  entityId: string;
  businessId: string;
  amount: number;
  currency: string;
  exp: number;
  nonce: string;
}

export function isLocalPaymentSimulatorEnabled() {
  return process.env.NODE_ENV !== "production"
    && process.env.LOCAL_PAYMENT_SIMULATOR === "true";
}

function simulatorSecret() {
  return process.env.LOCAL_PAYMENT_SIMULATOR_SECRET
    ?? process.env.AUTH_SECRET
    ?? process.env.NEXTAUTH_SECRET
    ?? "puragenda-local-payment-simulator-development-only";
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", simulatorSecret())
    .update(payload)
    .digest("base64url");
}

export function createLocalPaymentToken(
  input: Omit<LocalPaymentPayload, "exp" | "nonce">,
) {
  if (!isLocalPaymentSimulatorEnabled()) {
    throw new Error("Local payment simulator is disabled");
  }

  const payload: LocalPaymentPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + 30 * 60,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyLocalPaymentToken(token: string): LocalPaymentPayload | null {
  if (!isLocalPaymentSimulatorEnabled()) return null;

  const [encoded, signature, ...extra] = token.split(".");
  if (!encoded || !signature || extra.length > 0) return null;

  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<LocalPaymentPayload>;
    if (
      (payload.kind !== "subscription" && payload.kind !== "deposit")
      || typeof payload.entityId !== "string"
      || typeof payload.businessId !== "string"
      || typeof payload.amount !== "number"
      || !Number.isFinite(payload.amount)
      || payload.amount <= 0
      || typeof payload.currency !== "string"
      || !/^[A-Z]{3}$/.test(payload.currency)
      || typeof payload.exp !== "number"
      || payload.exp <= Math.floor(Date.now() / 1000)
      || typeof payload.nonce !== "string"
    ) {
      return null;
    }
    return payload as LocalPaymentPayload;
  } catch {
    return null;
  }
}

export function localPaymentCheckoutUrl(origin: string, token: string) {
  const url = new URL("/api/dev/payment-simulator", origin);
  url.searchParams.set("token", token);
  return url.toString();
}

export function localProviderId(kind: LocalPaymentKind) {
  return `LOCAL_${kind.toUpperCase()}:${crypto.randomUUID()}`;
}
