import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("marketing/kit-reservas-qr/muestras-colores");
const kits = [
  ["01-puragenda", "01 · PURAGENDA"],
  ["02-barberia-carbon", "02 · BARBERÍA CARBÓN"],
  ["03-estetica-rosa", "03 · ESTÉTICA ROSA"],
  ["04-wellness-verde", "04 · WELLNESS VERDE"],
  ["05-clinica-azul", "05 · CLÍNICA AZUL"],
];

const positions = [
  [70, 230],
  [1030, 230],
  [70, 900],
  [1030, 900],
  [550, 1570],
];

async function main() {
  const canvas = sharp({
    create: { width: 2000, height: 2300, channels: 4, background: "#F4F0F8" },
  });

  const header = Buffer.from(`
    <svg width="2000" height="2300" xmlns="http://www.w3.org/2000/svg">
      <text x="80" y="95" font-family="Arial Black,Arial,sans-serif" font-size="58" font-weight="900" fill="#111111">KIT DE RESERVAS · ADAPTACIÓN CROMÁTICA</text>
      <text x="82" y="145" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#5F5B66">Mismo diseño, cinco identidades visuales para distintos tipos de negocio.</text>
    </svg>
  `);

  const composites = [{ input: header, left: 0, top: 0 }];
  for (let i = 0; i < kits.length; i += 1) {
    const [folder, label] = kits[i];
    const [left, top] = positions[i];
    const preview = await sharp(path.join(root, folder, "presentacion-kit.png"))
      .resize(900, 619, { fit: "fill" })
      .png()
      .toBuffer();
    const labelSvg = Buffer.from(`
      <svg width="900" height="58" xmlns="http://www.w3.org/2000/svg">
        <rect width="900" height="58" rx="14" fill="#111111"/>
        <text x="450" y="39" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="27" font-weight="900" fill="#FFFFFF">${label}</text>
      </svg>
    `);
    composites.push({ input: preview, left, top });
    composites.push({ input: labelSvg, left, top: top + 626 });
  }

  await canvas.composite(composites).png().toFile(path.join(root, "catalogo-5-kits.png"));
  console.log(`Catálogo generado en ${path.join(root, "catalogo-5-kits.png")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
