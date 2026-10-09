import { spawn } from "node:child_process";
// Local fixtures with an isolated database and email delivery disabled.
const env = {
  ...process.env,
  WEBSITE_PINK_Y2K_PREVIEW: "1",
  WEBSITE_QA: "1",
  WEBSITE_ROOT_DOMAIN: "localhost",
  DATABASE_URL: "postgresql://websiteqa@127.0.0.1:55439/websiteqa",
  DIRECT_URL: "postgresql://websiteqa@127.0.0.1:55439/websiteqa",
  AUTH_SECRET: "local-pink-y2k-fixtures-only",
  RESEND_API_KEY: "",
  SMTP_HOST: "",
  SMTP_USER: "",
  SMTP_PASS: "",
  NEXT_PUBLIC_GA_ID: "",
  NEXT_PUBLIC_POSTHOG_KEY: "",
  NEXT_PUBLIC_APP_URL: "http://localhost:3007",
};
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", "3007", "-H", "127.0.0.1"],
  { env, stdio: "inherit", windowsHide: true },
);
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
child.on("exit", (code) => process.exit(code ?? 0));
