import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { mcpConfig } from "./config";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(32).toString("base64url");
export class McpError extends Error {
  constructor(public code: string, public status = 403) { super(code); }
}

// Bound the stream itself, including requests without Content-Length.
export async function readLimited(request: Request, max = 32768) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new McpError("REQUEST_TOO_LARGE", 413); }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== mcpConfig().origin) throw new McpError("INVALID_ORIGIN");
}

export async function limit(key: string, max: number, windowMs = 60000) {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "ApiRateLimitBucket" ("key", "count", "resetAt", "updatedAt") VALUES (${digest(`mcp:${key}`)}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond', NOW())
    ON CONFLICT ("key") DO UPDATE SET
    "count" = CASE WHEN "ApiRateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE "ApiRateLimitBucket"."count" + 1 END,
    "resetAt" = CASE WHEN "ApiRateLimitBucket"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "ApiRateLimitBucket"."resetAt" END,
    "updatedAt" = NOW() RETURNING "count"`;
  if (!rows[0] || rows[0].count > max) throw new McpError("RATE_LIMITED", 429);
}

function encryptionKey() {
  const key = Buffer.from(process.env.MCP_OPERATION_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32) throw new McpError("WRITES_UNAVAILABLE", 503);
  return key;
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}
export function decrypt(value: string): unknown {
  const data = Buffer.from(value, "base64");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8"));
}
