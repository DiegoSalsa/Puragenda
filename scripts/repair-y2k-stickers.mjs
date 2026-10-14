import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import sharp from "sharp";

// Only alpha pixels outside the artwork are removed. Six wider source crops
// recover pixels discarded by the old rectangle/polygon packaging masks.
function inside(x, y, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) result = !result;
  }
  return result;
}
const repairs = {
  "pink-batman": { issue: "Línea suelta bajo el óvalo", clear: (x, y) => y >= 119 && x < 60 },
  "kitty-leopard-gold": { issue: "Trazo negro ajeno sobre la cabeza" },
  "pink-paw": { issue: "Contorno cortado por la máscara anterior", source: true },
  "kitty-leopard-head": { issue: "Bigotes y borde inferior recortados", source: true },
  "monster-claws": { issue: "Fragmento de pedrería bajo las garras" },
  "leopard-domo": { issue: "Fragmento rosa bajo la esquina izquierda" },
  "betty-leopard-heart": { issue: "Tira rosa lateral y puntos ajenos" },
  "pink-cherries-banner": { issue: "Fragmento dorado sobre la cinta" },
  "kitty-handbag": { issue: "Línea horizontal sobre la cabeza" },
  "bite-me": { issue: "Restos sobre y bajo las palabras", keep: 2 },
  "black-gold-cross": { issue: "Borde del celular vecino bajo la punta", clear: (_x, y) => y >= 288 },
  "bratz-logo": { issue: "Fragmento de cruz en el lateral derecho" },
  "circuit-heart": { issue: "Borde superior cortado por la máscara anterior", source: true },
  "puma-heart": { issue: "Tira diagonal bajo el corazón" },
  "pink-phone": { issue: "Punta de la cruz vecina sobre el celular", clear: (_x, y) => y < 4 },
  "monster-high": { issue: "Triángulo rosa en el lateral derecho" },
  "pink-glitter-star": { issue: "Fragmento oscuro junto a la punta derecha" },
  "bunny-skull-tiara": { issue: "Aro de la oreja cortado y restos del lazo vecino", source: true, clear: (x, y) => inside(x, y, [[128, 284], [144, 290], [151, 296], [180, 315], [99, 315], [107, 301], [119, 290]]) },
  "pink-bow": { issue: "Fragmento rosa superior y mandíbula cortada", source: true, clear: (x, y) => y < 2 || y < 19 && (x < 87 - .8 * y || x > 100 + 1.3 * y) },
  "pink-dragon-crest-alt": { issue: "Arco del corazón vecino en el lateral derecho" },
  "ribs-heart": { issue: "Punto y línea ajenos a la izquierda" },
  "laced-heart": { issue: "Fragmento rosa bajo los cordones" },
  "message-phone": { issue: "Esquina inferior derecha del celular cortada", source: true, keep: 2 },
  "yass-wifi": { issue: "Línea horizontal bajo el recuadro" },
  "leopard-paw": { issue: "Línea horizontal bajo la huella", keep: 4 },
  "i-love-me": { issue: "Trazos sueltos a la derecha del texto", keep: 4 },
  "planet": { issue: "Línea suelta bajo el anillo" },
  "cute-100": { issue: "Fragmento del juguete vecino bajo el texto", keep: 2 },
  "avril-magazines": { issue: "Fragmento rosa a la izquierda de las revistas" },
  "leopard-heart": { issue: "Arco del anillo vecino sobre el corazón" },
  "bunny-duo": { issue: "Rectángulo rosa bajo el conejo negro" },
  "juicy": { issue: "Fragmentos rosas arriba y a la derecha del texto", select: c => c.minX < 306 && c.area > 10 && (c.minY > 4 || c.maxY > 10) },
  "zebra-star": { issue: "Línea vertical al lado derecho de la estrella" },
  "pink-exclamation": { issue: "Triángulo rosa junto al signo de exclamación", keep: 4, clear: (x, y) => x < 14 && y > 118 },
  "chrome-star": { issue: "Fragmento rosa retirado y punta cromada completada", tip: true, clear: (_x, y, r, g, b) => y > 180 && r > g * 1.4 && r > b * 1.15 },
  "pink-monkey": { issue: "Oreja izquierda cortada por el borde de la lámina", ear: true },
  "kitty-glitter": { issue: "Fragmento plateado sobre la oreja izquierda", clear: (x, y, r, g, b) => y < 15 && x > 32 && x < 75 && Math.max(r, g, b) - Math.min(r, g, b) < 40 },
};

const root = resolve("output/sticker-repair");
const publicDirectory = resolve("public/websites/pink-y2k/stickers");
await mkdir(resolve(root, "after"), { recursive: true });
await mkdir(resolve(root, "before"), { recursive: true });
const manifestPath = resolve(publicDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function components(data, width, height) {
  const labels = new Int32Array(width * height), queue = new Int32Array(labels.length), rows = [];
  for (let pixel = 0; pixel < labels.length; pixel++) {
    if (labels[pixel] || data[pixel * 4 + 3] < 128) continue;
    const label = rows.length + 1;
    let head = 0, tail = 1, minX = width, minY = height, maxX = 0, maxY = 0;
    queue[0] = pixel; labels[pixel] = label;
    while (head < tail) {
      const current = queue[head++], x = current % width, y = Math.floor(current / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (!labels[next] && data[next * 4 + 3] >= 128) { labels[next] = label; queue[tail++] = next; }
      }
    }
    rows.push({ label, area: tail, minX, minY, maxX, maxY });
  }
  return { labels, rows: rows.sort((a, b) => b.area - a.area) };
}

function cleanAlpha(data, width, height, spec) {
  if (spec.clear) for (let pixel = 0; pixel < width * height; pixel++) {
    const i = pixel * 4;
    if (spec.clear(pixel % width, Math.floor(pixel / width), data[i], data[i + 1], data[i + 2])) data[i + 3] = 0;
  }
  const { labels, rows } = components(data, width, height);
  const selected = spec.select ? rows.filter(spec.select) : rows.slice(0, spec.keep ?? 1);
  const allowed = new Set(selected.map(c => c.label)), mask = new Uint8Array(labels.length);
  // Preserve the original soft edge one pixel around the selected opaque cores.
  for (let pixel = 0; pixel < labels.length; pixel++) {
    if (!allowed.has(labels[pixel])) continue;
    const x = pixel % width, y = Math.floor(pixel / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) mask[(y + dy) * width + x + dx] = 1;
    }
  }
  let removed = 0;
  for (let pixel = 0; pixel < labels.length; pixel++) {
    const i = pixel * 4;
    if (!mask[pixel] && data[i + 3]) { data[i + 3] = 0; removed++; }
    if (!data[i + 3]) data.fill(0, i, i + 4);
  }
  return { removed, selected: selected.map(({ area, minX, minY, maxX, maxY }) => ({ area, minX, minY, maxX, maxY })) };
}

function restoreEar(data, width, height) {
  // The sheet itself cuts this ear off. Mirror the visible pink texture into
  // the missing 18-pixel crescent; leave every existing artwork pixel intact.
  const extra = 20, expanded = Buffer.alloc((width + extra) * height * 4);
  for (let y = 0; y < height; y++) data.copy(expanded, (y * (width + extra) + extra) * 4, y * width * 4, (y + 1) * width * 4);
  const border = [...data.subarray((87 * width + 1) * 4, (87 * width + 1) * 4 + 3)];
  for (let y = 80; y <= 140; y++) for (let x = -19; x < 0; x++) {
    const distance = Math.hypot(x - 8, y - 110), alpha = Math.min(1, Math.max(0, 26.5 - distance));
    if (!alpha) continue;
    const target = (y * (width + extra) + x + extra) * 4;
    const sample = (y * width + Math.min(18, -x + 2)) * 4;
    const sampled = [...data.subarray(sample, sample + 3)];
    const pink = sampled[2] < 80 ? [...data.subarray((98 * width + 4) * 4, (98 * width + 4) * 4 + 3)] : sampled;
    const color = distance > 23 ? border : pink;
    expanded.set([...color, Math.round(alpha * 255)], target);
  }
  return { data: expanded, width: width + extra, height, channels: 4 };
}

function restoreChromeTip(data, width, height) {
  // The neighboring pink artwork covered the final tip. Recover only the
  // missing pixels from this same sticker's opposite chrome point.
  for (let y = 180; y < height; y++) for (let x = 75; x < 120; x++) {
    const target = (y * width + x) * 4, sample = ((height - 1 - y) * width + width - 1 - x) * 4;
    const color = [...data.subarray(sample, sample + 4)];
    const weight = Math.min(1, (y - 180) / 5), oldAlpha = data[target + 3] / 255, newAlpha = color[3] / 255;
    const alpha = oldAlpha * (1 - weight) + newAlpha * weight;
    for (let channel = 0; channel < 3; channel++) data[target + channel] = alpha ? Math.round((data[target + channel] * oldAlpha * (1 - weight) + color[channel] * newAlpha * weight) / alpha) : 0;
    data[target + 3] = Math.round(alpha * 255);
  }
}

const records = [];
for (const [kind, spec] of Object.entries(repairs)) {
  const row = manifest.assets.find(row => row.kind === kind);
  assert.ok(row, kind);
  const original = resolve(publicDirectory, `${kind}.webp`);
  await copyFile(original, resolve(root, "before", basename(original)));
  const input = spec.source ? resolve("scripts/fixtures/y2k-sticker-repairs", `${kind}.png`) : original;
  let { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const stats = cleanAlpha(data, info.width, info.height, spec);
  if (spec.tip) restoreChromeTip(data, info.width, info.height);
  if (spec.ear) { const restored = restoreEar(data, info.width, info.height); data = restored.data; info = restored; }
  const buffer = await sharp(data, { raw: info }).trim({ threshold: 1 }).extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ lossless: true }).toBuffer();
  const metadata = await sharp(buffer).metadata();
  assert.ok(metadata.hasAlpha && metadata.width > 20 && metadata.height > 20, kind);
  const filename = `${kind}-repaired.webp`, after = resolve(root, "after", filename);
  await writeFile(after, buffer);
  records.push({ kind, name: row.name, issue: spec.issue, source: spec.source ? `scripts/fixtures/y2k-sticker-repairs/${kind}.png` : row.src.replace("-repaired", ""), before: basename(original), after: filename, sha256: createHash("sha256").update(buffer).digest("hex"), width: metadata.width, height: metadata.height, bytes: buffer.length, ...stats });
}
await writeFile(resolve(root, "repairs.json"), JSON.stringify({ reviewed: manifest.assets.length, repaired: records.length, method: "Limpieza de alfa y recuperación de píxeles originales; oreja recortada reconstruida a partir de la textura visible", assets: records }, null, 2));
if (process.argv.includes("--apply")) {
  for (const record of records) {
    await copyFile(resolve(root, "after", record.after), resolve(publicDirectory, record.after));
    const row = manifest.assets.find(row => row.kind === record.kind);
    Object.assign(row, { src: `/websites/pink-y2k/stickers/${record.after}`, width: record.width, height: record.height, bytes: record.bytes, repair: { method: "Original-pixel alpha cleanup", issue: record.issue, sha256: record.sha256 } });
  }
  manifest.repairs = { reviewed: manifest.assets.length, repaired: records.length, report: "output/sticker-repair/index.html" };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  const categories = ["Personajes", "Brillos", "Textos", "Música", "Accesorios"];
  const code = `// Reference cutouts supplied by the customer. See the packaging manifest for provenance.\nexport const STICKER_CATEGORIES = ${JSON.stringify(categories)} as const;\nexport const REFERENCE_STICKERS = [\n${manifest.assets.map(({ kind, name, category, src }) => `  ${JSON.stringify({ kind, name, category, src })},`).join("\n")}\n] as const;\n`;
  await writeFile(resolve("src/websites/templates/pink-y2k/reference-stickers.ts"), code);
}
console.log(JSON.stringify({ reviewed: manifest.assets.length, repaired: records.length, applied: process.argv.includes("--apply") }));
