import { MercadoPagoConfig, PreApproval } from "mercadopago";
import * as dotenv from "dotenv";
dotenv.config();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

async function test() {
  const preapproval = new PreApproval(mpClient);
  try {
    const result = await preapproval.create({
      body: {
        reason: "Puragenda — Plan Test (Dummy Business)",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 1000,
          currency_id: "CLP",
        },
        payer_email: "test@example.com",
        back_url: "https://www.puragenda.cl/dashboard/settings",
        status: "pending",
      },
    });
    console.log("Success:", result.init_point);
  } catch (error: any) {
    console.error("Error creating subscription:", error.message || error);
    if (error.cause) console.error(error.cause);
  }
}

test();
