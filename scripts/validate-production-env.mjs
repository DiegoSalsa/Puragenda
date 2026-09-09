export function validateProductionEnv(env = process.env) {
  const problems = [];
  const authSecret = env.GIFT_CARD_SECRET || env.AUTH_SECRET || env.NEXTAUTH_SECRET;

  if (!authSecret || authSecret.length < 32) {
    problems.push("GIFT_CARD_SECRET, AUTH_SECRET or NEXTAUTH_SECRET must contain at least 32 characters");
  }

  for (const name of ["DATABASE_URL", "MERCADOPAGO_WEBHOOK_SECRET", "RESEND_API_KEY", "EMAIL_FROM"]) {
    if (!env[name]?.trim()) problems.push(`${name} is required`);
  }

  try {
    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL || "");
    if (appUrl.protocol !== "https:" || ["localhost", "0.0.0.0", "127.0.0.1"].includes(appUrl.hostname)) {
      problems.push("NEXT_PUBLIC_APP_URL must be a public HTTPS URL");
    }
  } catch {
    problems.push("NEXT_PUBLIC_APP_URL must be a valid public HTTPS URL");
  }

  if (problems.length > 0) {
    throw new Error(`Production environment validation failed:\n- ${problems.join("\n- ")}`);
  }
}
