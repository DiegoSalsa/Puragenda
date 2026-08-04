import { Environment, Paddle } from "@paddle/paddle-node-sdk";

type InternationalPlan = "INDIVIDUAL" | "EQUIPO";

export type PaddleCheckoutItem = {
  priceId: string;
  quantity: number;
};

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} no está configurada`);
  return value;
}

export function getPaddleEnvironment() {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? Environment.production
    : Environment.sandbox;
}

export function getPaddleServerClient() {
  const environment = getPaddleEnvironment();
  const apiKey = process.env.PADDLE_API_KEY?.trim()
    ?? (environment === Environment.sandbox
      ? process.env.PADDLE_SANDBOX_API_KEY?.trim()
      : process.env.PADDLE_LIVE_API_KEY?.trim());

  if (!apiKey) throw new Error("No hay una clave privada de Paddle configurada");

  return new Paddle(apiKey, { environment });
}

export function getPaddleCheckoutItems(
  plan: InternationalPlan,
  extraStaffCount: number,
): PaddleCheckoutItem[] {
  const basePriceId = getRequiredEnvironmentVariable(
    plan === "INDIVIDUAL"
      ? "NEXT_PUBLIC_PADDLE_PRICE_INDIVIDUAL"
      : "NEXT_PUBLIC_PADDLE_PRICE_EQUIPO",
  );
  const items: PaddleCheckoutItem[] = [{ priceId: basePriceId, quantity: 1 }];

  if (plan === "EQUIPO" && extraStaffCount > 0) {
    items.push({
      priceId: getRequiredEnvironmentVariable("NEXT_PUBLIC_PADDLE_PRICE_EXTRA_STAFF"),
      quantity: extraStaffCount,
    });
  }

  return items;
}
