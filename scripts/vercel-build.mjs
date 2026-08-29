import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Preview deployments may share runtime credentials, but they must never
// mutate the production schema. Production remains the single migration owner.
if (process.env.VERCEL_ENV === "production") {
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(`[vercel-build] Skipping database migrations for ${process.env.VERCEL_ENV || "local"}.`);
}

run("npm", ["run", "build"]);

