import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
describe("audit 04 isolated build egress", () => {
  it("permits only loopback at runtime and public HTTPS font hosts during an explicit isolated build", () => {
    const code = `import { stagingHostAllowed as allowed } from ${JSON.stringify(pathToFileURL(resolve("scripts/next-staging-network-guard.mjs")).href)}; console.log(JSON.stringify(["http://127.0.0.1:3128", "https://fonts.googleapis.com/css", "https://fonts.gstatic.com/font.woff2", "http://fonts.gstatic.com/font", "https://fonts.googleapis.com.evil.invalid", "https://api.resend.com", "https://api.mercadopago.com", "https://api.paddle.com"].map(allowed)));`;
    for (const flag of ["0", "1"]) {
      const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], { env: { ...process.env, NEXT_ISOLATED_BUILD_FONTS: flag }, encoding: "utf8", windowsHide: true });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([true, flag === "1", flag === "1", false, false, false, false, false]);
    }
  });
});
