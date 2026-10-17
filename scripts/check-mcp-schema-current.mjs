import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

// Public specification checks only; never reads local account credentials.
const require = createRequire(import.meta.url);
const sdkRequire = createRequire(require.resolve("@modelcontextprotocol/sdk/validation/ajv"));
const Ajv2020 = sdkRequire("ajv/dist/2020").default;
const schemaUrl = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const guideUrl = "https://developers.openai.com/plugins/build/plugins.md";
const responses = await Promise.all([fetch(schemaUrl), fetch(guideUrl)]);
for (const response of responses) assert(response.ok, `Public specification returned ${response.status}`);
const [schemaText, guide] = await Promise.all(responses.map((response) => response.text()));
const schema = JSON.parse(schemaText);
const snapshot = JSON.parse(await fs.readFile(new URL("../docs/mcp/schemas/mcp.schema.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await fs.readFile(new URL("../plugins/puragenda/mcp.json", import.meta.url), "utf8"));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
assert(validate(manifest), JSON.stringify(validate.errors));
const documentedAuth = structuredClone(manifest);
documentedAuth.mcpServers.puragenda.extensions = { "com.openai": { auth: { type: "mixed" } } };
const extensionAccepted = validate(documentedAuth);
const errors = structuredClone(validate.errors);
const guideDescribesServerAuth = guide.includes('extensions["com.openai"].auth') && guide.includes('auth.type: "mixed"');
const report = {
  checkedAt: new Date().toISOString(), classification: "VALIDADO LOCALMENTE",
  schemaUrl, guideUrl: guideUrl.replace(/\.md$/, ""),
  downloadedSchemaSha256: createHash("sha256").update(schemaText).digest("hex"),
  matchesVendoredSchemaSemantically: JSON.stringify(schema) === JSON.stringify(snapshot),
  portableManifestAccepted: true, documentedAuthExtensionAccepted: extensionAccepted,
  guideDescribesServerAuth, extensionValidationErrors: errors,
  realOpenAIImporterTested: false,
  resolution: extensionAccepted ? "Current schema accepts the auth extension; review the portable manifest before publication."
    : "The current published schema still rejects the documented per-server auth extension. Keep the portable manifest valid. Use the documented custom-MCP URL setup with separately configured Mixed auth and discovery; its actual OpenAI UI behavior remains pending external access."
};
const output = new URL("../artifacts/mcp/iteration-2/schema-current-check.json", import.meta.url);
await fs.mkdir(new URL("./", output), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ portableManifestAccepted: true, documentedAuthExtensionAccepted: extensionAccepted, guideDescribesServerAuth, matchesVendoredSchemaSemantically: report.matchesVendoredSchemaSemantically }));
