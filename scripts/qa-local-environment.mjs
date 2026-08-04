import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const defaultSourceEnv = path.resolve(projectRoot, "..", "ProyectosInteresantes", "Puragenda", ".env");

export function buildQaEnvironment() {
  let source = {};
  const sourcePath = process.env.PURAGENDA_QA_ENV_SOURCE || defaultSourceEnv;
  if (fs.existsSync(sourcePath)) {
    source = dotenv.parse(fs.readFileSync(sourcePath));
  }

  const rawDatabaseUrl = process.env.PURAGENDA_QA_DATABASE_URL
    || source.DIRECT_URL
    || source.DATABASE_URL;
  if (!rawDatabaseUrl) {
    throw new Error(
      "No hay una conexión PostgreSQL para QA. Define PURAGENDA_QA_DATABASE_URL o PURAGENDA_QA_ENV_SOURCE.",
    );
  }

  const databaseUrl = new URL(rawDatabaseUrl);
  databaseUrl.searchParams.set("schema", "puragenda_cambiosultimos_qa");

  return {
    ...process.env,
    DATABASE_URL: databaseUrl.toString(),
    DIRECT_URL: databaseUrl.toString(),
    AUTH_SECRET: "puragenda-cambiosultimos-local-auth-secret-only",
    NEXTAUTH_SECRET: "puragenda-cambiosultimos-local-auth-secret-only",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    LOCAL_PAYMENT_SIMULATOR: "true",
    LOCAL_PAYMENT_SIMULATOR_SECRET: "puragenda-cambiosultimos-local-payment-secret-only",
    RESEND_API_KEY: "",
  };
}
