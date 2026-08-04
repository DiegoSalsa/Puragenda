import { Environment, Paddle } from "@paddle/paddle-node-sdk";

type CatalogEntry = {
  productName: string;
  productDescription: string;
  priceDescription: string;
  amount: string;
  configKey: string;
};

const entries: CatalogEntry[] = [
  {
    productName: "Puragenda Individual",
    productDescription: "Suscripción mensual individual a Puragenda.",
    priceDescription: "Puragenda Individual — USD 13.99/mes",
    amount: "1399",
    configKey: "NEXT_PUBLIC_PADDLE_PRICE_INDIVIDUAL",
  },
  {
    productName: "Puragenda Equipo",
    productDescription: "Suscripción mensual de equipo a Puragenda.",
    priceDescription: "Puragenda Equipo — USD 32.99/mes",
    amount: "3299",
    configKey: "NEXT_PUBLIC_PADDLE_PRICE_EQUIPO",
  },
  {
    productName: "Puragenda Adicional de Equipo",
    productDescription: "Puesto adicional mensual para una suscripción de equipo de Puragenda.",
    priceDescription: "Puragenda Adicional de Equipo — USD 3.49/mes",
    amount: "349",
    configKey: "NEXT_PUBLIC_PADDLE_PRICE_EXTRA_STAFF",
  },
];

async function findProduct(paddle: Paddle, name: string) {
  const products = paddle.products.list({ perPage: 100 });
  for await (const product of products) {
    if (product.name === name) return product;
  }
  return undefined;
}

async function findMonthlyUsdPrice(paddle: Paddle, productId: string, amount: string) {
  const prices = paddle.prices.list({ perPage: 100, productId: [productId] });
  for await (const price of prices) {
    if (price.unitPrice.currencyCode === "USD"
      && price.unitPrice.amount === amount
      && price.billingCycle?.interval === "month"
      && price.billingCycle.frequency === 1) {
      return price;
    }
  }
  return undefined;
}

async function findCheckoutToken(paddle: Paddle) {
  const clientTokens = paddle.clientTokens.list({ perPage: 100 });
  for await (const token of clientTokens) {
    if (token.name === "Puragenda production checkout" && token.status === "active") {
      return token;
    }
  }
  return undefined;
}

async function main() {
  const apiKey = process.env.PADDLE_LIVE_API_KEY?.trim();
  if (!apiKey) throw new Error("PADDLE_LIVE_API_KEY no está configurada.");

  const paddle = new Paddle(apiKey, { environment: Environment.production });
  const ids: Record<string, string> = {};

  for (const entry of entries) {
    const product = await findProduct(paddle, entry.productName)
      ?? await paddle.products.create({
        name: entry.productName,
        description: entry.productDescription,
        taxCategory: "saas",
      });

    const price = await findMonthlyUsdPrice(paddle, product.id, entry.amount)
      ?? await paddle.prices.create({
        productId: product.id,
        description: entry.priceDescription,
        unitPrice: { amount: entry.amount, currencyCode: "USD" },
        billingCycle: { interval: "month", frequency: 1 },
      });

    ids[entry.configKey] = price.id;
  }

  const clientToken = await findCheckoutToken(paddle)
    ?? await paddle.clientTokens.create({
      name: "Puragenda production checkout",
      description: "Paddle.js token for Puragenda's production checkout.",
    });

  ids.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = clientToken.token;

  process.stdout.write(`${JSON.stringify(ids)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
