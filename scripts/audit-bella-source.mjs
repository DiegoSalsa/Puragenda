import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const source = path.resolve('C:/Users/diego/Desktop/purocode-demos');
const output = path.resolve('docs/websites');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = new Set(walk(path.join(source, 'src/app/studio')));
// Follow every local import, including shared animated icons and their types.
for (const file of files) {
  if (!/\.(tsx?|css)$/.test(file)) continue;
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*\(|import\s+)["']([^"']+)["']/g)) {
    const spec = match[1];
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const base = spec.startsWith('@/') ? path.join(source, 'src', spec.slice(2)) : path.resolve(path.dirname(file), spec);
    const found = [base, `${base}.ts`, `${base}.tsx`, `${base}.css`, path.join(base, 'index.ts')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (found) files.add(found);
  }
}
['src/app/layout.tsx', 'src/app/globals.css', 'package.json', 'next.config.ts'].forEach(p => { if (fs.existsSync(path.join(source, p))) files.add(path.join(source, p)); });
walk(path.join(source, 'public/demos/studio')).forEach(p => files.add(p));
walk(path.join(source, 'docs/demos/studio')).forEach(p => files.add(p));
const manifest = [...files].sort().map(file => ({ path: path.relative(source, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
const git = args => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
if (process.argv.includes('--verify')) {
  const frozen = JSON.parse(fs.readFileSync(path.join(output, 'bella-source-manifest.json'), 'utf8'));
  if (JSON.stringify(manifest) !== JSON.stringify(frozen.files) || git(['rev-parse', 'HEAD']) !== frozen.commit || git(['status', '--porcelain']) !== frozen.status) throw new Error('La referencia cambió después de congelarse');
  for (const item of manifest.filter(file => file.path.startsWith('public/demos/studio/'))) {
    const ported = path.resolve('public/websites/bella', item.path.slice('public/demos/studio/'.length));
    if (crypto.createHash('sha256').update(fs.readFileSync(ported)).digest('hex') !== item.sha256) throw new Error(`Asset distinto: ${ported}`);
  }
  console.log(`PASS: ${manifest.length} archivos originales intactos y 10 assets portados idénticos`);
  process.exit(0);
}
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'bella-source-manifest.json'), JSON.stringify({ source, capturedAt: new Date().toISOString(), commit: git(['rev-parse', 'HEAD']), status: git(['status', '--porcelain']), files: manifest }, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'bella-source-audit.md'), `# Bella: referencia congelada\n\nFuente de solo lectura: ${source}. Commit: ${git(['rev-parse', 'HEAD'])}. El manifiesto SHA-256 conserva también los cambios locales de la referencia. No se ejecutó ni editó el proyecto original.\n\n## Arquitectura y componentes\n\nNext.js App Router. page.tsx carga catálogo en servidor; layout.tsx aplica fuentes y SEO noindex. Header (menú móvil/Escape), Action (CTA e icono animado), Portfolio (filtros, rail, diálogo nativo, marquee con pausa), Services (selección/detalle/opciones), Studio (selector de proceso), BookingSection (sesión y carga diferida), BookingFlow (5 pasos, errores, conflicto, idempotencia, resultado incierto), Motion (IntersectionObserver).\n\n## Diseño vs datos\n\nTemplate: composición editorial, escalas tipográficas, espaciados, fotografía, rail asimétrico, colores controlados, CSS, transiciones, UI de booking. Datos a parametrizar: wordmark ESTÉTICA/BELLA, headline, introducción, fotografías/alt/captions, portfolio/categorías, proceso/nosotros, contacto, redes, SEO. Servicios/precios/duraciones/opciones, profesionales/asignaciones, sucursales y horarios proceden del catálogo canónico; no se guardan en website config.\n\n## Fuentes, CSS y motion\n\nBricolage Grotesque (--bella-display), DM Sans (--bella-body), next/font/google con display swap. Variables locales --red, --red-text, --ink, --paper, --gray, --line, --ease. CSS Modules, sin dependencia del dashboard. Animaciones CSS masthead, shutter, galleryChange, drift, enter; IntersectionObserver threshold .12; motion/react solo en iconos con useReducedMotion. Pausa explícita del marquee, prefers-reduced-motion, focus-visible y skip link.\n\n## Responsive\n\n${[...fs.readFileSync(path.join(source, 'src/app/studio/studio.module.css'), 'utf8').matchAll(/@media[^\{]+/g)].map(m => '- ' + m[0]).join('\n')}\n\nValidar 1440×900, 1280×900, 390×844, 360×800. Wordmark largo debe caber sin recortar, galerías variables y bloques vacíos deben ocultarse.\n\n## Booking\n\nUI local con reducer (service/options/location/staff/date/slot/customer), 5 pasos y carga diferida. Adapters demo, legacy HTTP y v1. El provider v1 convierte el contrato público existente; demoAvailability es fixture, no un motor real. La migración conserva la UI pero utiliza loadBookingContext/toBookingCatalog/getBookingAvailability y el POST canónico de Puragenda con Idempotency-Key. Las API keys quedan exclusivamente en servidor; previews no crean citas.\n\n## Dependencias\n\nnext/image, next/font/google, next/dynamic, React hooks, motion/react, IntersectionObserver, matchMedia, HTMLDialogElement, AbortController, crypto.randomUUID, Intl y fetch. Dependencias compartidas de iconos incluidas en el manifiesto. Puragenda ya dispone de motion, Next y React; no se añade otro motor de motion.\n\n## Archivos exactos\n\n| Archivo | Bytes | SHA-256 |\n| --- | ---: | --- |\n${manifest.map(f => '| ' + f.path + ' | ' + f.bytes + ' | ' + f.sha256 + ' |').join('\n')}\n`);
console.log(`Referencia congelada: ${manifest.length} archivos`);
