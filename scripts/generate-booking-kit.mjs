import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import QRCode from "qrcode";
import sharp from "sharp";

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readColorArg(name, fallback) {
  const value = readArg(name, fallback);
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`El color --${name} debe usar formato hexadecimal de seis dígitos, por ejemplo #7C3AED.`);
  }
  return value.toUpperCase();
}

const BRAND = {
  purple: readColorArg("primary", "#7C3AED"),
  purpleDark: readColorArg("primary-dark", "#5B21B6"),
  cream: readColorArg("background", "#FFFAEB"),
  white: "#FFFFFF",
  black: "#000000",
  ink: readColorArg("ink", "#1A1E24"),
  pink: readColorArg("accent-pink", "#FFB5E8"),
  cyan: readColorArg("accent-cyan", "#85E3FF"),
  mint: readColorArg("accent-mint", "#BFFCC6"),
  yellow: readColorArg("accent-yellow", "#FFF5BA"),
};

const businessName = readArg("business", "Estudio Demo");
const bookingUrl = readArg("url", "https://puragenda.cl");
const outputDir = path.resolve(readArg("out", "marketing/kit-reservas-qr/demo"));

const xmlEscape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const dataUri = (contents, mime = "image/svg+xml") =>
  `data:${mime};base64,${Buffer.from(contents).toString("base64")}`;

const font = "'Plus Jakarta Sans','Arial Black',Arial,Helvetica,sans-serif";
const bodyFont = "'Plus Jakarta Sans',Arial,Helvetica,sans-serif";

function svgRoot(width, height, content, label) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xmlEscape(label)}">
  <title>${xmlEscape(label)}</title>
  ${content}
</svg>`;
}

function logoImage(logoUri, x, y, width, height) {
  return `<image href="${logoUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
}

function qrImage(qrUri, x, y, size) {
  return `
    <rect x="${x - 2}" y="${y - 2}" width="${size + 4}" height="${size + 4}" rx="3" fill="${BRAND.white}" stroke="${BRAND.black}" stroke-width="1.5"/>
    <image href="${qrUri}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
}

function doorSticker(logoUri, qrUri) {
  return svgRoot(
    120,
    180,
    `
    <rect width="120" height="180" rx="6" fill="${BRAND.cream}"/>
    <rect x="1.5" y="1.5" width="117" height="177" rx="5" fill="none" stroke="${BRAND.black}" stroke-width="3"/>
    <rect x="34" y="8" width="52" height="10" rx="5" fill="${BRAND.black}"/>
    <text x="60" y="15.2" text-anchor="middle" fill="${BRAND.white}" font-family="${font}" font-size="4.7" font-weight="900" letter-spacing=".45">RESERVAS 24/7</text>
    ${logoImage(logoUri, 29, 22, 62, 25)}

    <g font-family="${font}" font-weight="900" text-anchor="middle" fill="${BRAND.black}">
      <rect x="14" y="51" width="92" height="14" rx="2" fill="${BRAND.cyan}" stroke="${BRAND.black}" stroke-width="1.2"/>
      <text x="60" y="61" font-size="8.2" textLength="82" lengthAdjust="spacingAndGlyphs">RESERVA TU HORA</text>
      <rect x="38" y="68" width="44" height="14" rx="2" fill="${BRAND.pink}" stroke="${BRAND.black}" stroke-width="1.2"/>
      <text x="60" y="78.5" font-size="10">AQUÍ</text>
    </g>

    ${qrImage(qrUri, 28, 88, 64)}
    <text x="60" y="160" text-anchor="middle" fill="${BRAND.black}" font-family="${font}" font-size="5.3" font-weight="900">ESCANEA Y ELIGE TU HORA</text>
    <text x="60" y="168" text-anchor="middle" fill="${BRAND.ink}" font-family="${bodyFont}" font-size="4" font-weight="700">${xmlEscape(businessName)}</text>
    <circle cx="52" cy="174" r="1.6" fill="${BRAND.purple}"/><circle cx="60" cy="174" r="1.6" fill="${BRAND.pink}"/><circle cx="68" cy="174" r="1.6" fill="${BRAND.cyan}"/>
    `,
    `Adhesivo de puerta Puragenda para ${businessName}`,
  );
}

function counterSticker(logoUri, qrUri) {
  return svgRoot(
    100,
    100,
    `
    <rect width="100" height="100" rx="7" fill="${BRAND.purple}"/>
    <rect x="2" y="2" width="96" height="96" rx="6" fill="none" stroke="${BRAND.black}" stroke-width="3"/>
    <rect x="8" y="8" width="84" height="82" rx="5" fill="${BRAND.cream}" stroke="${BRAND.black}" stroke-width="1.5"/>
    ${logoImage(logoUri, 32, 10, 36, 14.5)}
    <rect x="14" y="27" width="72" height="11" rx="1.5" fill="${BRAND.cyan}" stroke="${BRAND.black}" stroke-width="1"/>
    <text x="50" y="35" text-anchor="middle" fill="${BRAND.black}" font-family="${font}" font-size="6.4" font-weight="900" textLength="62" lengthAdjust="spacingAndGlyphs">RESERVA TU HORA</text>
    ${qrImage(qrUri, 31, 42, 38)}
    <rect x="20" y="84" width="60" height="6" rx="3" fill="${BRAND.black}"/>
    <text x="50" y="88.3" text-anchor="middle" fill="${BRAND.white}" font-family="${font}" font-size="3.4" font-weight="900" letter-spacing=".15">ESCANEA Y RESERVA</text>
    `,
    `Adhesivo de mostrador Puragenda para ${businessName}`,
  );
}

function roundSticker(logoUri, qrUri) {
  return svgRoot(
    70,
    70,
    `
    <circle cx="35" cy="35" r="34" fill="${BRAND.purple}" stroke="${BRAND.black}" stroke-width="2"/>
    <rect x="15" y="8" width="40" height="9" rx="4.5" fill="${BRAND.pink}" stroke="${BRAND.black}" stroke-width="1.1"/>
    <text x="35" y="14.2" text-anchor="middle" fill="${BRAND.black}" font-family="${font}" font-size="3.9" font-weight="900">RESERVA AQUÍ</text>

    <rect x="15" y="19" width="40" height="38" rx="5" fill="${BRAND.black}" opacity=".2" transform="translate(1.5 1.5)"/>
    <rect x="15" y="19" width="40" height="38" rx="5" fill="${BRAND.white}" stroke="${BRAND.black}" stroke-width="1.3"/>
    <image href="${qrUri}" x="19" y="22" width="32" height="32"/>

    <text x="35" y="62" text-anchor="middle" fill="${BRAND.white}" font-family="${font}" font-size="3.45" font-weight="900" letter-spacing=".08">CON PURAGENDA</text>
    `,
    `Adhesivo circular Puragenda para ${businessName}`,
  );
}

function tableCard(logoUri, qrUri) {
  return svgRoot(
    105,
    148,
    `
    <rect width="105" height="148" rx="4" fill="${BRAND.yellow}"/>
    <rect x="1.5" y="1.5" width="102" height="145" rx="3" fill="none" stroke="${BRAND.black}" stroke-width="3"/>
    <rect x="0" y="0" width="105" height="35" rx="4" fill="${BRAND.purple}"/>
    <rect x="23.5" y="6" width="58" height="23" rx="4" fill="${BRAND.cream}" stroke="${BRAND.black}" stroke-width="1.2"/>
    ${logoImage(logoUri, 26.5, 7.5, 52, 20)}
    <g font-family="${font}" font-weight="900" text-anchor="middle" fill="${BRAND.black}">
      <text x="52.5" y="47" font-size="5.8">¿QUIERES AGENDAR?</text>
      <rect x="13" y="51" width="79" height="12" rx="1.5" fill="${BRAND.cyan}" stroke="${BRAND.black}" stroke-width="1"/>
      <text x="52.5" y="60" font-size="7" textLength="68" lengthAdjust="spacingAndGlyphs">TU PRÓXIMA HORA</text>
    </g>
    ${qrImage(qrUri, 26.5, 69, 52)}
    <text x="52.5" y="128" text-anchor="middle" fill="${BRAND.ink}" font-family="${bodyFont}" font-size="4" font-weight="800">${xmlEscape(businessName)}</text>
    <rect x="13" y="134" width="79" height="9" rx="4.5" fill="${BRAND.black}"/>
    <text x="52.5" y="140.2" text-anchor="middle" fill="${BRAND.white}" font-family="${font}" font-size="4.4" font-weight="900" letter-spacing=".25">ESCANEA · ELIGE · RESERVA</text>
    <rect x="1.5" y="1.5" width="102" height="145" rx="3" fill="none" stroke="${BRAND.black}" stroke-width="3"/>
    `,
    `Tarjeta de mostrador Puragenda para ${businessName}`,
  );
}

function previewSheet(assets) {
  const embeds = Object.fromEntries(Object.entries(assets).map(([key, svg]) => [key, dataUri(svg)]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="12" dy="16" stdDeviation="12" flood-opacity=".2"/></filter>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${BRAND.cream}"/><stop offset="1" stop-color="#F0E8FF"/></linearGradient>
  </defs>
  <rect width="1600" height="1100" fill="url(#bg)"/>
  <circle cx="1460" cy="90" r="170" fill="${BRAND.pink}" opacity=".65"/>
  <circle cx="90" cy="1030" r="210" fill="${BRAND.cyan}" opacity=".55"/>
  <text x="95" y="100" fill="${BRAND.black}" font-family="${font}" font-size="56" font-weight="900">KIT DE RESERVAS PURAGENDA</text>
  <text x="98" y="146" fill="${BRAND.ink}" font-family="${bodyFont}" font-size="25" font-weight="700">Piezas personalizadas para ${xmlEscape(businessName)}</text>

  <g filter="url(#shadow)">
    <image href="${embeds.door}" x="100" y="210" width="360" height="540"/>
    <image href="${embeds.table}" x="530" y="210" width="341" height="481"/>
    <image href="${embeds.counter}" x="965" y="210" width="330" height="330"/>
    <image href="${embeds.round}" x="1260" y="610" width="235" height="235"/>
  </g>

  <g font-family="${bodyFont}" fill="${BRAND.black}">
    <text x="280" y="800" text-anchor="middle" font-size="24" font-weight="900">PUERTA / VITRINA</text><text x="280" y="832" text-anchor="middle" font-size="20">120 × 180 mm</text>
    <text x="700" y="740" text-anchor="middle" font-size="24" font-weight="900">MOSTRADOR A6</text><text x="700" y="772" text-anchor="middle" font-size="20">105 × 148 mm</text>
    <text x="1130" y="590" text-anchor="middle" font-size="24" font-weight="900">ADHESIVO CUADRADO</text><text x="1130" y="622" text-anchor="middle" font-size="20">100 × 100 mm</text>
    <text x="1378" y="890" text-anchor="middle" font-size="24" font-weight="900">ADHESIVO REDONDO</text><text x="1378" y="922" text-anchor="middle" font-size="20">Ø 70 mm</text>
  </g>
  <rect x="95" y="970" width="720" height="70" rx="12" fill="${BRAND.black}"/>
  <text x="455" y="1015" text-anchor="middle" fill="${BRAND.white}" font-family="${font}" font-size="25" font-weight="900">QR ÚNICO PARA CADA NEGOCIO</text>
</svg>`;
}

async function renderSvg(svg, fileBase) {
  const svgPath = path.join(outputDir, `${fileBase}.svg`);
  const pngPath = path.join(outputDir, `${fileBase}.png`);
  await fs.writeFile(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg), { density: 300 }).png().toFile(pngPath);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const sourceLogo = await fs.readFile(path.resolve("public/logos/logoPuragendaSVG.svg"), "utf8");
  const croppedLogo = sourceLogo
    .replace(/width="1659\.000000pt" height="948\.000000pt"/, 'width="1300" height="525"')
    .replace('viewBox="0 0 1659.000000 948.000000"', 'viewBox="190 175 1300 525"');
  const logoUri = dataUri(croppedLogo);

  const qrSvg = await QRCode.toString(bookingUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 3,
    color: { dark: BRAND.black, light: BRAND.white },
  });
  const qrUri = dataUri(qrSvg);

  const assets = {
    door: doorSticker(logoUri, qrUri),
    table: tableCard(logoUri, qrUri),
    counter: counterSticker(logoUri, qrUri),
    round: roundSticker(logoUri, qrUri),
  };

  await renderSvg(assets.door, "01-adhesivo-puerta-120x180mm");
  await renderSvg(assets.table, "02-tarjeta-mostrador-a6");
  await renderSvg(assets.counter, "03-adhesivo-mostrador-100x100mm");
  await renderSvg(assets.round, "04-adhesivo-redondo-70mm");

  const preview = previewSheet(assets);
  await fs.writeFile(path.join(outputDir, "presentacion-kit.svg"), preview, "utf8");
  await sharp(Buffer.from(preview)).png().toFile(path.join(outputDir, "presentacion-kit.png"));

  await fs.writeFile(
    path.join(outputDir, "datos-generacion.txt"),
    `Negocio: ${businessName}\nURL codificada en el QR: ${bookingUrl}\nGenerado: ${new Date().toISOString()}\n`,
    "utf8",
  );

  console.log(`Kit generado en ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
