import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

// Only create a real Resend instance if API key is set; otherwise use a mock
export const resend = apiKey
  ? new Resend(apiKey)
  : ({
      emails: {
        send: async (params: Record<string, unknown>) => {
          console.log("[Email Mock] Would send email:", JSON.stringify(params, null, 2));
          return { data: { id: "mock-id" }, error: null };
        },
      },
    } as unknown as Resend);

export const EMAIL_FROM = process.env.EMAIL_FROM || "Puragenda <onboarding@resend.dev>";

