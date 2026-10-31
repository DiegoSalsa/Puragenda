import { spawnSync } from "node:child_process";
import { validateProductionEnv } from "./validate-production-env.mjs";

// These branches are published exclusively for independent code review.
if (["fix/puragenda-next-audit-01-registration", "fix/puragenda-next-audit-02-agenda", "fix/puragenda-next-audit-03-services-staff","fix/puragenda-next-audit-04-clients-privacy","fix/puragenda-next-audit-05-billing-subscriptions"].includes(process.env.VERCEL_GIT_COMMIT_REF ?? "")) {
  console.error("[vercel-build] AUDIT_BRANCH_BUILD_DISABLED: this review branch cannot deploy.");
  process.exit(1);
}

// Publishing RC1 for code review must not deploy it into the connected project.
// An authorized, separate staging project may opt in, always as Preview.
if (process.env.VERCEL_GIT_COMMIT_REF === "release/puragenda-next-rc1" &&
    (process.env.VERCEL_ENV !== "preview" || process.env.PURAGENDA_RC1_STAGING_BUILD !== "1")) {
  console.error("[vercel-build] RC1_AUDIT_ONLY: requires an explicitly authorized isolated Preview staging build.");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Preview deployments may share runtime credentials, but they must never
// mutate the production schema. Production remains the single migration owner.
if (process.env.VERCEL_ENV === "production") {
  validateProductionEnv();
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(`[vercel-build] Skipping database migrations for ${process.env.VERCEL_ENV || "local"}.`);
}

run("npm", ["run", "build"]);

