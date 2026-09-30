import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey && process.env.NODE_ENV === "production") {
  console.error("[Email] RESEND_API_KEY is missing in production. Emails will be mocked and will not appear in Resend.");
}

// Only create a real Resend instance if API key is set; otherwise use a mock
export const resend = apiKey
  ? new Resend(apiKey)
  : ({
      emails: {
        send: async () => {
          console.log("[Email Mock] Email delivery suppressed");
          return { data: { id: "mock-id" }, error: null };
        },
      },
    } as unknown as Resend);

export const EMAIL_FROM = process.env.EMAIL_FROM || "Puragenda <onboarding@resend.dev>";
