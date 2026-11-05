export function validateProductionEnv(env = process.env) {
  const problems = [];
  // Session verification uses AUTH_SECRET (with NEXTAUTH_SECRET as its
  // documented fallback). A different token secret must never make a
  // production build look valid while sessions fail at runtime.
  const authSecret = env.AUTH_SECRET || env.NEXTAUTH_SECRET;

  if (!authSecret || authSecret.length < 32) {
    problems.push("AUTH_SECRET or NEXTAUTH_SECRET must contain at least 32 characters");
  }

  for (const name of ["DATABASE_URL", "MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_SECRET", "RESEND_API_KEY", "EMAIL_FROM"]) {
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

  if (env.PURAGENDA_NEXT_ENABLED === "1" && env.PURAGENDA_MP_V2_ENABLED !== "1") {
    problems.push("Puragenda Next requires its subscription checkout to be enabled");
  }
  if (env.PURAGENDA_MP_V2_ENABLED === "1") {
    if (env.PURAGENDA_MP_V2_ENVIRONMENT !== "production" || env.PURAGENDA_MP_V2_PRODUCTION_WRITES !== "1") {
      problems.push("Production subscription checkout requires the explicit production environment and write switch");
    }
    for (const [name, value] of [
      ["PURAGENDA_MP_V2_PRODUCTION_ACCOUNT_ID", env.PURAGENDA_MP_V2_PRODUCTION_ACCOUNT_ID],
      ["PURAGENDA_MP_V2_PRODUCTION_APPLICATION_ID or MP_APP_ID", env.PURAGENDA_MP_V2_PRODUCTION_APPLICATION_ID || env.MP_APP_ID],
    ]) {
      if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) problems.push(`${name} must identify the verified production account/application`);
    }
    try {
      const billing = new URL(env.PURAGENDA_MP_V2_APP_URL || "");
      const app = new URL(env.NEXT_PUBLIC_APP_URL || "");
      if (billing.protocol !== "https:" || billing.origin !== app.origin || billing.pathname !== "/" || billing.search || billing.hash || billing.username || billing.password) {
        problems.push("PURAGENDA_MP_V2_APP_URL must match the production application origin");
      }
    } catch { problems.push("PURAGENDA_MP_V2_APP_URL must match the production application origin"); }
  }

  if (problems.length > 0) {
    throw new Error(`Production environment validation failed:\n- ${problems.join("\n- ")}`);
  }
}
