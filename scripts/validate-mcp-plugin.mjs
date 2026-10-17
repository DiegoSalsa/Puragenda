import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
// Use the validator shipped with our pinned official MCP SDK, not ESLint's Ajv 6.
const sdkRequire = createRequire(require.resolve("@modelcontextprotocol/sdk/validation/ajv"));
const Ajv2020 = sdkRequire("ajv/dist/2020").default;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const root = path.resolve("plugins/puragenda");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
for (const name of ["plugin", "mcp"]) {
  const schema = read(`docs/mcp/schemas/${name}.schema.json`);
  const manifest = read(`${root}/${name}.json`);
  const validate = ajv.compile(schema);
  assert(validate(manifest), JSON.stringify(validate.errors));
}
const plugin = read(`${root}/plugin.json`);
const ext = plugin.extensions["com.openai"];
const ui = ext.interface;
for (const key of ["displayName", "shortDescription"]) assert(ui[key].trim().length > 0 && ui[key].length <= 30, key);
assert(ui.longDescription.length <= 4000 && ui.developerName.length <= 80);
assert(ui.defaultPrompt.length <= 3 && ui.defaultPrompt.every((p) => p.length > 0 && p.length <= 128));
for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) assert(new URL(ui[key]).protocol === "https:");
for (const key of ["composerIcon", "composerIconDark", "logo", "logoDark"]) {
  assert(ui[key].startsWith("./assets/")); assert(fs.statSync(path.join(root, ui[key])).isFile());
}
assert(ext.review.test_cases.positive.length === 5 && ext.review.test_cases.negative.length === 3);
if (ext.review.demo_recording_url) assert(new URL(ext.review.demo_recording_url).protocol === "https:");
const mcp = read(`${root}/mcp.json`);
assert(Object.keys(mcp.mcpServers).length === 1);
assert(mcp.mcpServers.puragenda.type === "streamable-http");
assert(new URL(mcp.mcpServers.puragenda.url).protocol === "https:");
const skill = fs.readFileSync(`${root}/skills/puragenda/SKILL.md`, "utf8");
assert(/^---\r?\nname: puragenda\r?\ndescription: .+\r?\n---/u.test(skill));
assert(!JSON.stringify(mcp).includes("clientSecret"));
console.log("PASS: Agent Plugins 1.0.0 plugin.json + mcp.json schemas; OpenAI listing limits, assets, skill, 5/3 review cases. Portal scans and demo remain external gates.");
