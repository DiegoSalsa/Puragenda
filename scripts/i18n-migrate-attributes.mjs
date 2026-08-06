import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const roots = [join(root, "src", "app"), join(root, "src", "components")];
const attributeNames = new Set(["placeholder", "title", "aria-label", "alt"]);
const excluded = new Set(["Puragenda", "PuroCode", "Google Calendar", "Mercado Pago", "Paddle", "HH:MM", "Email"]);

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

function idFor(source) {
  return createHash("sha256").update(source).digest("base64url").slice(0, 12);
}

function topLevelComponent(node, sourceFile) {
  let current = node.parent;
  let candidate = null;
  while (current && current !== sourceFile) {
    if (ts.isFunctionDeclaration(current) && current.body && current.parent === sourceFile) candidate = current;
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isVariableDeclaration(current.parent)) {
      const statement = current.parent.parent?.parent;
      if (statement && ts.isVariableStatement(statement) && statement.parent === sourceFile) candidate = current;
    }
    current = current.parent;
  }
  return candidate;
}

const catalogFile = join(root, "messages", "legacy", "es.json");
const catalog = existsSync(catalogFile) ? JSON.parse(readFileSync(catalogFile, "utf8")) : {};
let changedFiles = 0;
let found = 0;

for (const file of roots.flatMap(filesIn)) {
  const code = readFileSync(file, "utf8");
  if (!/^\s*["']use client["'];/m.test(code)) continue;
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = [];
  const hookBodies = new Set();

  function visit(node) {
    if (ts.isJsxAttribute(node) && attributeNames.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const source = node.initializer.text.replace(/\s+/g, " ").trim();
      const component = topLevelComponent(node, sourceFile);
      const translatable = component?.body && ts.isBlock(component.body) && source.length >= 2
        && /[A-Za-zÀ-ÿ¿¡]/.test(source) && !excluded.has(source)
        && !/^https?:|^[\w.+-]+@[\w.-]+$|^[+*#\d\s:./-]+$/.test(source);
      if (translatable) {
        const id = idFor(source);
        catalog[id] = source;
        replacements.push({ start: node.initializer.getStart(sourceFile), end: node.initializer.getEnd(), text: `{legacy("${id}")}` });
        hookBodies.add(component.body);
        found++;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (apply && replacements.length) {
    for (const body of hookBodies) {
      replacements.push({ start: body.getStart(sourceFile) + 1, end: body.getStart(sourceFile) + 1, text: `\n  const legacy = useTranslations("legacy");` });
    }
    let output = code;
    for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
      output = output.slice(0, replacement.start) + replacement.text + output.slice(replacement.end);
    }
    if (!/import\s*\{[^}]*\buseTranslations\b[^}]*\}\s*from\s*["']next-intl["']/.test(output)) {
      const directiveEnd = output.indexOf("\n") + 1;
      output = output.slice(0, directiveEnd) + 'import { useTranslations } from "next-intl";\n' + output.slice(directiveEnd);
    }
    writeFileSync(file, output, "utf8");
    changedFiles++;
  }
}

const ordered = Object.fromEntries(Object.entries(catalog).sort((a, b) => a[0].localeCompare(b[0])));
writeFileSync(catalogFile, JSON.stringify(ordered, null, 2) + "\n", "utf8");
process.stdout.write(`Attribute messages: ${found}; files: ${changedFiles}; apply=${apply}\n`);
