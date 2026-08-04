"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

export type PaddleCheckoutPayload = {
  provider: "paddle";
  items: Array<{ priceId: string; quantity: number }>;
  customer: { email: string; countryCode: string };
  customData: Record<string, string>;
  successUrl: string;
};

type BillingCheckoutResponse = PaddleCheckoutPayload & { init_point?: never } | {
  provider?: never;
  init_point: string;
};

let paddlePromise: Promise<Paddle | undefined> | undefined;

async function getPaddle() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
  if (!token || (environment !== "sandbox" && environment !== "production")) {
    throw new Error("El Checkout internacional no está configurado.");
  }

  paddlePromise ??= initializePaddle({ token, environment });

  try {
    const paddle = await paddlePromise;
    if (!paddle) throw new Error("No se pudo iniciar el Checkout internacional.");
    return paddle;
  } catch (error) {
    // A failed script load must be retryable (for example, after a transient
    // network error or after a development server refresh).
    paddlePromise = undefined;
    throw error;
  }
}

export async function startBillingCheckout(payload: BillingCheckoutResponse) {
  if ("init_point" in payload && payload.init_point) {
    window.location.href = payload.init_point;
    return;
  }

  if (payload.provider !== "paddle") {
    throw new Error("No se recibió una sesión de Checkout válida.");
  }

  const paddle = await getPaddle();
  paddle.Checkout.open({
    items: payload.items,
    customer: {
      email: payload.customer.email,
      address: { countryCode: payload.customer.countryCode },
    },
    customData: payload.customData,
    settings: {
      variant: "one-page",
      successUrl: payload.successUrl,
    },
  });
}
