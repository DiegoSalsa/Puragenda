import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const roots = [join(root, "src", "app"), join(root, "src", "components")];
const catalogFile = join(root, "messages", "legacy", "es.json");
const catalog = existsSync(catalogFile) ? JSON.parse(readFileSync(catalogFile, "utf8")) : {};
const uiCalls = /^(alert|confirm|set[A-Za-z]*(Error|Message|Notice|Feedback|Status))$/;

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

function idFor(source) {
  return createHash("sha256").update(source).digest("base64url").slice(0, 12);
}

function looksSpanish(source) {
  return source.length >= 2 && /[A-Za-zÀ-ÿ¿¡]/.test(source)
    && (/[áéíóúñ¿¡]/i.test(source) || /\b(el|la|los|las|un|una|de|del|al|para|por|con|sin|que|tu|tus|esta|este|cita|citas|cliente|clientes|servicio|servicios|negocio|pago|pagos|guardar|eliminar|agregar|cancelar|selecciona|horario|correo|contraseña|suscripción|campaña|premio|configuración|error|éxito|activo|inactivo|cerrar|abrir|mostrar|ocultar|día|días|mes|meses)\b/i.test(source))
    && !/^https?:|^[\w.+-]+@[\w.-]+$|^[A-Z0-9_ -]+$|^[.#\w:/-]+$/.test(source);
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

function insideJsxExpression(node, boundary) {
  let current = node.parent;
  while (current && current !== boundary) {
    if (ts.isJsxAttribute(current)) return false;
    if (ts.isJsxExpression(current)) return true;
    current = current.parent;
  }
  return false;
}

function insideUiCall(node, boundary, sourceFile) {
  let current = node.parent;
  while (current && current !== boundary) {
    if (ts.isCallExpression(current)) {
      const name = current.expression.getText(sourceFile).replace(/^window\./, "");
      if (uiCalls.test(name)) return true;
      if (name === "legacy" || name.endsWith(".legacy")) return false;
    }
    current = current.parent;
  }
  return false;
}

let found = 0;
let changedFiles = 0;
for (const file of roots.flatMap(filesIn)) {
  const code = readFileSync(file, "utf8");
  if (!/^\s*["']use client["'];/m.test(code)) continue;
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = [];
  const hookBodies = new Set();

  function visit(node) {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && looksSpanish(node.text)) {
      const component = topLevelComponent(node, sourceFile);
      if (component?.body && ts.isBlock(component.body)
        && (insideJsxExpression(node, component, sourceFile) || insideUiCall(node, component, sourceFile))) {
        const id = idFor(node.text);
        catalog[id] = node.text;
        replacements.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: `legacy("${id}")` });
        hookBodies.add(component.body);
        found++;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (apply && replacements.length) {
    for (const body of hookBodies) {
      const bodyText = body.getText(sourceFile);
      if (!/\bconst\s+legacy\s*=\s*useTranslations\(["']legacy["']\)/.test(bodyText)) {
        replacements.push({ start: body.getStart(sourceFile) + 1, end: body.getStart(sourceFile) + 1, text: `\n  const legacy = useTranslations("legacy");` });
      }
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
process.stdout.write(`Client expression messages: ${found}; files: ${changedFiles}; apply=${apply}\n`);
