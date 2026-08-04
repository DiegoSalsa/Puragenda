import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildQaEnvironment } from "./qa-local-environment.mjs";

const prismaBin = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const qaEnvironment = buildQaEnvironment();

function run(command, args) {
  return new Promise((resolve) => {
    const processHandle = spawn(command, args, { stdio: "inherit", env: qaEnvironment });
    processHandle.on("exit", (code) => resolve(code ?? 1));
  });
}

console.log("[QA] Preparando el esquema PostgreSQL aislado puragenda_cambiosultimos_qa...");
const prepareExit = await run(process.execPath, [prismaBin, "db", "push"]);
if (prepareExit !== 0) process.exit(prepareExit);

if (process.argv.includes("--prepare-only")) process.exit(0);

console.log("[QA] Iniciando Puragenda con pagos simulados y correos desactivados...");
const child = spawn(process.execPath, [nextBin, "dev", "-H", "0.0.0.0"], {
  stdio: "inherit",
  env: qaEnvironment,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
