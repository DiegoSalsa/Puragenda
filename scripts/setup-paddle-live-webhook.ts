import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const destination = "https://puragenda.vercel.app/api/webhooks/paddle";
const description = "Puragenda production subscription sync";

async function main() {
  const apiKey = process.env.PADDLE_LIVE_API_KEY?.trim();
  if (!apiKey) throw new Error("PADDLE_LIVE_API_KEY no está configurada.");

  const paddle = new Paddle(apiKey, { environment: Environment.production });
  const settings = await paddle.notificationSettings.list();
  const existing = settings.find(
    (setting) => setting.destination === destination && setting.description === description,
  );

  const notificationSetting = existing ?? await paddle.notificationSettings.create({
    description,
    destination,
    type: "url",
    trafficSource: "all",
    subscribedEvents: [
      "customer.created",
      "customer.updated",
      "subscription.activated",
      "subscription.canceled",
      "subscription.created",
      "subscription.past_due",
      "subscription.updated",
      "transaction.completed",
    ],
  });

  if (!notificationSetting.endpointSecretKey) {
    throw new Error("Paddle no devolvió el secreto del destino de notificaciones.");
  }

  process.stdout.write(`${JSON.stringify({
    id: notificationSetting.id,
    destination: notificationSetting.destination,
    PADDLE_NOTIFICATION_WEBHOOK_SECRET: notificationSetting.endpointSecretKey,
  })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
