import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const translate = process.argv.includes("--translate");
const repair = process.argv.includes("--repair");
const sourceRoots = [join(root, "src", "app"), join(root, "src", "components")];
const excluded = new Set(["Puragenda", "PuroCode", "Google Calendar", "Mercado Pago", "Paddle"]);
const skippedTags = new Set(["option", "code", "pre", "script", "style", "title"]);

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

function idFor(source) {
  return createHash("sha256").update(source).digest("base64url").slice(0, 12);
}

function extractFile(file) {
  const code = readFileSync(file, "utf8");
  if (file.endsWith("localized-text.tsx")) return { code, replacements: [], messages: new Map() };
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = [];
  const messages = new Map();

  function visit(node) {
    if (ts.isJsxText(node)) {
      const source = node.getText(sourceFile).replace(/\s+/g, " ").trim();
      const parent = node.parent;
      const tag = ts.isJsxElement(parent) && ts.isIdentifier(parent.openingElement.tagName)
        ? parent.openingElement.tagName.text
        : "";
      const translatable = source.length >= 2 && /[A-Za-zÀ-ÿ¿¡]/.test(source) && !excluded.has(source)
        && !skippedTags.has(tag) && !/^https?:|^[\w.+-]+@[\w.-]+$/.test(source);

      if (translatable) {
        const original = node.getText(sourceFile);
        const leading = original.match(/^\s*/)?.[0] ?? "";
        const trailing = original.match(/\s*$/)?.[0] ?? "";
        const id = idFor(source);
        replacements.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: `${leading}<LocalizedText id="${id}" />${trailing}` });
        messages.set(id, source);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return { code, replacements, messages };
}

const fileResults = sourceRoots.flatMap(filesIn).map((file) => ({ file, ...extractFile(file) }));
const sourceMessages = new Map();
for (const result of fileResults) for (const [id, source] of result.messages) sourceMessages.set(id, source);

if (apply) {
  for (const result of fileResults) {
    if (!result.replacements.length) continue;
    let code = result.code;
    for (const replacement of result.replacements.sort((a, b) => b.start - a.start)) {
      code = code.slice(0, replacement.start) + replacement.text + code.slice(replacement.end);
    }
    if (!code.includes('from "@/components/i18n/localized-text"')) {
      const directive = code.startsWith('"use client";') ? code.indexOf("\n") + 1 : 0;
      code = code.slice(0, directive) + '\nimport { LocalizedText } from "@/components/i18n/localized-text";\n' + code.slice(directive);
    }
    writeFileSync(result.file, code, "utf8");
  }
}

const catalogDir = join(root, "messages", "legacy");
mkdirSync(catalogDir, { recursive: true });
const existingSourceFile = join(catalogDir, "es.json");
const existingSource = existsSync(existingSourceFile) ? JSON.parse(readFileSync(existingSourceFile, "utf8")) : {};
const orderedSource = Object.fromEntries(Object.entries({ ...existingSource, ...Object.fromEntries(sourceMessages) }).sort((a, b) => a[0].localeCompare(b[0])));
writeFileSync(join(catalogDir, "es.json"), JSON.stringify(orderedSource, null, 2) + "\n", "utf8");

async function translateBatch(entries, target) {
  const markerText = entries.map(([id, value]) => `[[${id}]] ${value}`).join("\n");
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "es");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", markerText);
  const response = await fetch(url, { headers: { "User-Agent": "Puragenda-i18n-migration/1.0" } });
  if (!response.ok) throw new Error(`Translation request failed: ${response.status}`);
  const payload = await response.json();
  const text = payload[0].map((part) => part[0]).join("");
  const found = [...text.matchAll(/\[\[([A-Za-z0-9_-]+)\]\]\s*([^\[]*)(?=\[\[|$)/g)];
  return new Map(found.map((match) => [match[1], match[2].trim()]));
}

async function translateOne(source, target) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx"); url.searchParams.set("sl", "es");
  url.searchParams.set("tl", target); url.searchParams.set("dt", "t"); url.searchParams.set("q", source);
  const response = await fetch(url, { headers: { "User-Agent": "Puragenda-i18n-migration/1.0" } });
  if (!response.ok) throw new Error(`Translation request failed: ${response.status}`);
  const payload = await response.json();
  return payload[0].map((part) => part[0]).join("").trim();
}

if (translate) {
  const targets = { en: "en", it: "it", pt: "pt", fr: "fr", de: "de", "zh-CN": "zh-CN" };
  const entries = Object.entries(orderedSource);
  for (const [locale, target] of Object.entries(targets)) {
    const outputFile = join(catalogDir, `${locale}.json`);
    const output = existsSync(outputFile) ? JSON.parse(readFileSync(outputFile, "utf8")) : {};
    const missing = entries.filter(([id]) => !output[id]);
    const chunks = [];
    for (let index = 0; index < missing.length; index += 20) chunks.push(missing.slice(index, index + 20));
    for (let index = 0; index < chunks.length; index += 6) {
      const group = chunks.slice(index, index + 6);
      const translatedGroup = await Promise.all(group.map((chunk) => translateBatch(chunk, target)));
      for (let chunkIndex = 0; chunkIndex < group.length; chunkIndex += 1) {
        for (const [id, source] of group[chunkIndex]) output[id] = translatedGroup[chunkIndex].get(id) || source;
      }
    }
    writeFileSync(outputFile, JSON.stringify(output, null, 2) + "\n", "utf8");
  }
}

if (repair) {
  const targets = { en: "en", it: "it", pt: "pt", fr: "fr", de: "de", "zh-CN": "zh-CN" };
  for (const [locale, target] of Object.entries(targets)) {
    const outputFile = join(catalogDir, `${locale}.json`);
    const output = JSON.parse(readFileSync(outputFile, "utf8"));
    const pending = Object.entries(orderedSource).filter(([id, source]) => output[id] === source && /[A-Za-zÀ-ÿ¿¡]/.test(source) && !excluded.has(source));
    for (let index = 0; index < pending.length; index += 6) {
      const group = pending.slice(index, index + 6);
      const translated = await Promise.all(group.map(([, source]) => translateOne(source, target)));
      group.forEach(([id, source], item) => { output[id] = translated[item] || source; });
    }
    writeFileSync(outputFile, JSON.stringify(output, null, 2) + "\n", "utf8");
  }
}

process.stdout.write(`Static JSX messages: ${sourceMessages.size}; files: ${fileResults.filter((item) => item.replacements.length).length}; apply=${apply}; translate=${translate}; repair=${repair}\n`);
