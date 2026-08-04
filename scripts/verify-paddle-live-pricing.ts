import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const priceId = "pri_01kz6zg8eca8hkfhwryr38z2yg";
const markets = [
  { countryCode: "CO", currencyCode: "COP" },
  { countryCode: "MX", currencyCode: "MXN" },
  { countryCode: "AR", currencyCode: "ARS" },
] as const;

async function main() {
  const apiKey = process.env.PADDLE_LIVE_API_KEY?.trim();
  if (!apiKey) throw new Error("PADDLE_LIVE_API_KEY no está configurada.");

  const paddle = new Paddle(apiKey, { environment: Environment.production });
  const previews = [];

  for (const market of markets) {
    const preview = await paddle.pricingPreview.preview({
      items: [{ priceId, quantity: 1 }],
      address: { countryCode: market.countryCode },
      currencyCode: market.currencyCode,
    });
    const item = preview.details.lineItems[0];
    previews.push({
      countryCode: market.countryCode,
      currencyCode: preview.currencyCode,
      total: item.formattedTotals.total,
      tax: item.formattedTotals.tax,
    });
  }

  process.stdout.write(`${JSON.stringify(previews)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
