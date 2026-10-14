import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";

// Rectangles are measured on the background-extracted sheets, not invented artwork.
// Run with the directory containing sheet-1.png, sheet-2.png and sheet-3.png.
const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error("Pass the directory containing the three extracted sheets");
const destination = resolve("public/websites/pink-y2k/stickers");
await mkdir(destination, { recursive: true });
const priorManifest = await readFile(resolve(destination, "manifest.json"), "utf8").then(JSON.parse).catch(error => {
  if (error.code === "ENOENT") return null;
  throw error;
});
const repaired = new Map((priorManifest?.assets ?? []).filter(row => row.repair).map(row => [row.kind, row]));
const rows = [];
const add = (sheet, kind, name, category, left, top, width, height) => rows.push({ sheet, kind, name, category, box: { left, top, width, height } });

// Sheet 1: leopard, glitter and fashion graphics.
add(1, "leopard-gold-star", "Estrella de leopardo dorada", "Brillos", 44, 12, 140, 140);
add(1, "hot-psychotic", "Hot in psychotic", "Textos", 188, 28, 187, 127);
add(1, "cant-afford-me", "You can't afford me", "Textos", 385, 36, 207, 228);
add(1, "bunny-banknote", "Billete rosa", "Accesorios", 604, 40, 195, 137);
add(1, "floral-cross", "Cruz de flores", "Brillos", 788, 28, 161, 224);
add(1, "pink-pass", "Pase rosa", "Accesorios", 39, 144, 118, 141);
add(1, "pink-batman", "Batman rosa", "Personajes", 183, 150, 195, 136);
add(1, "chrome-heart", "Corazón de cristal", "Brillos", 619, 175, 174, 156);
add(1, "kitty-leopard-gold", "Hello Kitty leopardo dorado", "Personajes", 37, 275, 246, 192);
add(1, "leopard-pink-lips", "Labios rosa y leopardo", "Brillos", 272, 275, 256, 153);
add(1, "pink-paw", "Huella rosa", "Personajes", 236, 390, 145, 103);
add(1, "kitty-leopard-head", "Hello Kitty leopardo", "Personajes", 430, 350, 235, 224);
add(1, "skull-zebra-star", "Estrella cebra con calavera", "Brillos", 646, 269, 303, 326);
add(1, "monster-claws", "Garras Monster", "Personajes", 48, 447, 140, 176);
add(1, "leopard-domo", "Domo rosa", "Personajes", 183, 492, 169, 162);
add(1, "betty-leopard-heart", "Corazón Betty Boop", "Personajes", 343, 491, 140, 136);
add(1, "pink-cherries-banner", "Cherry girl", "Textos", 381, 578, 183, 97);
add(1, "gangsta-girl", "Gangsta girl", "Textos", 552, 573, 173, 127);
add(1, "no-rhinestones", "No! de pedrería", "Textos", 33, 610, 159, 128);
add(1, "kitty-handbag", "Hello Kitty con bolso", "Personajes", 157, 644, 199, 264);
add(1, "bite-me", "Bite Me!", "Textos", 340, 668, 261, 126);
add(1, "black-gold-cross", "Cruz negra y dorada", "Brillos", 713, 561, 236, 298);
add(1, "bratz-logo", "Bratz", "Textos", 363, 783, 254, 136);
add(1, "floral-cross-small", "Cruz floral rosa", "Brillos", 597, 735, 180, 214);
add(1, "burn-book", "Burn Book", "Accesorios", 39, 740, 123, 169);
add(1, "leopard-letter-i", "Letra I de leopardo", "Textos", 58, 911, 93, 218);
add(1, "circuit-heart", "Corazón circuito rosa", "Brillos", 139, 895, 211, 212);
add(1, "puma-heart", "Corazón Puma", "Brillos", 344, 913, 160, 161);
add(1, "sparkles", "Estrellas delineadas", "Brillos", 522, 901, 140, 124);
add(1, "pink-phone", "Celular rosa Y2K", "Accesorios", 766, 847, 151, 258);
add(1, "monster-high", "Monster High", "Personajes", 38, 1121, 262, 185);
add(1, "pink-glitter-star", "Estrella rosa glitter", "Brillos", 276, 1048, 257, 251);
add(1, "bunny-skull-tiara", "Orejas de conejo y calaveras", "Personajes", 471, 978, 285, 315);
add(1, "pink-youtube", "YouTube rosa", "Accesorios", 751, 1099, 179, 179);
add(1, "pink-dragon-crest", "Dragón rosa", "Personajes", 32, 1290, 212, 159);
add(1, "kitty-leopard-button", "Hello Kitty botón leopardo", "Personajes", 232, 1308, 127, 135);
add(1, "cage-crown", "Corona rosa de pedrería", "Brillos", 359, 1295, 165, 153);
add(1, "pink-bow", "Calavera con lazo", "Personajes", 508, 1264, 194, 206);
add(1, "pink-dragon-crest-alt", "Dragón rosa ornamental", "Personajes", 44, 1440, 221, 183);
add(1, "ribs-heart", "Corazón glitter y costillas", "Brillos", 227, 1455, 244, 190);
add(1, "pink-card", "Carta rosa", "Accesorios", 752, 1388, 179, 251);

// Sheet 2: music, leopard and early social web.
add(2, "domo-glitter", "Domo leopardo glitter", "Personajes", 38, 17, 233, 230);
add(2, "swag", "#SWAG", "Textos", 274, 25, 242, 164);
add(2, "laced-heart", "Corazón negro con cordones", "Brillos", 510, 9, 196, 245);
add(2, "zebra-cross", "Cruz cebra rosa", "Brillos", 706, 28, 93, 144);
add(2, "leopard-music-tile", "Nota de leopardo", "Música", 808, 11, 174, 171);
add(2, "message-phone", "Celular con mensaje", "Accesorios", 38, 245, 220, 205);
add(2, "zebra-pink-star", "Estrella cebra rosa", "Brillos", 215, 189, 190, 189);
add(2, "kitty-leopard-head-small", "Hello Kitty lazo fucsia", "Personajes", 399, 190, 141, 120);
add(2, "leopard-lips", "Labios leopardo", "Brillos", 532, 237, 155, 143);
add(2, "black-earbuds", "Auriculares negros", "Música", 404, 302, 126, 113);
add(2, "pink-facebook", "Facebook leopardo", "Accesorios", 687, 269, 160, 155);
add(2, "pink-swirl", "Espiral rosa y negra", "Brillos", 845, 279, 137, 133);
add(2, "sale-tag", "Etiqueta $9.99", "Accesorios", 30, 447, 141, 87);
add(2, "skull-guitar", "Guitarra con calavera", "Música", 164, 431, 124, 107);
add(2, "leopard-note", "Nota rosa de leopardo", "Música", 286, 378, 155, 163);
add(2, "pink-saxophone", "Saxofón rosa", "Música", 547, 370, 80, 84);
add(2, "treble-clef", "Clave de sol rosa", "Música", 632, 363, 73, 132);
add(2, "leopard-white-star", "Estrella blanca de leopardo", "Brillos", 440, 380, 177, 181);
add(2, "jewel-headphones", "Auriculares de pedrería", "Música", 590, 466, 103, 99);
add(2, "bronze-music-note", "Nota musical dorada", "Música", 701, 423, 112, 110);
add(2, "double-pink-hearts", "Corazones rosas", "Brillos", 815, 405, 149, 117);
add(2, "music-poster", "The life without music", "Música", 22, 533, 440, 391);
add(2, "treble-clef-gloss", "Clave de sol brillante", "Música", 458, 611, 66, 136);
add(2, "pink-music-note", "Nota musical rosa", "Música", 677, 640, 60, 75);
add(2, "glitter-lips-small", "Labios glitter", "Brillos", 498, 711, 115, 90);
add(2, "heart-headphones", "Auriculares con corazón", "Música", 470, 791, 136, 119);
add(2, "yass-wifi", "Yass WiFi", "Textos", 735, 524, 233, 214);
add(2, "brat-leopard", "Brat leopardo", "Textos", 607, 728, 384, 331);
add(2, "pink-equalizer", "Ecualizador rosa", "Música", 32, 925, 576, 205);
add(2, "kitty-pink-stamp", "Love Hello Kitty", "Personajes", 607, 1057, 236, 143);
add(2, "leopard-paw", "Huella de leopardo", "Brillos", 854, 1065, 137, 136);
add(2, "leopard-pink-stars", "Leopardo con estrellas rosas", "Brillos", 11, 1165, 592, 377);
add(2, "pink-whatsapp", "WhatsApp rosa", "Accesorios", 609, 1194, 116, 114);
add(2, "leopard-camera-icon", "Cámara leopardo", "Accesorios", 722, 1195, 109, 113);
add(2, "zebra-music-note", "Nota musical cebra", "Música", 841, 1188, 153, 147);
add(2, "i-love-me", "I love me", "Textos", 610, 1307, 236, 189);
add(2, "monster-claws-zebra", "Garras cebra rosa", "Personajes", 835, 1320, 153, 188);

// Sheet 3: chrome, kawaii and 2000s accessories.
add(3, "rawr", "Rawr", "Textos", 7, 72, 351, 133);
add(3, "butterfly", "Mariposa", "Brillos", 353, 36, 271, 225);
add(3, "pink-pistol", "Pistola rosa", "Accesorios", 720, 19, 273, 181);
add(3, "planet", "Planeta plateado", "Brillos", 4, 210, 183, 115);
add(3, "pixel-bear", "Osito pixel rosa", "Personajes", 198, 202, 179, 204);
add(3, "cute-100", "100% cute", "Textos", 377, 252, 252, 213);
add(3, "avril-magazines", "Revistas Y2K", "Accesorios", 615, 157, 439, 427);
add(3, "leopard-heart", "Corazón leopardo", "Brillos", 4, 303, 200, 185);
add(3, "bunny-duo", "Conejitos blanco y negro", "Personajes", 0, 504, 239, 181);
add(3, "pink-tamagotchi", "Tamagotchi rosa", "Accesorios", 239, 410, 244, 260);
add(3, "crown", "Tiara", "Brillos", 483, 478, 271, 180);
add(3, "juicy", "Juicy de pedrería", "Textos", 343, 658, 395, 176);
add(3, "heart-skull", "Calavera con corazones", "Personajes", 850, 583, 220, 172);
add(3, "zebra-star", "Estrella cebra", "Brillos", 0, 675, 209, 231);
add(3, "pink-exclamation", "¡? rosa", "Textos", 190, 662, 159, 176);
add(3, "pink-glitter-bunny", "Conejo rosa glitter", "Personajes", 706, 646, 162, 204);
add(3, "chrome-star", "Estrella cromada", "Brillos", 789, 778, 239, 213);
add(3, "pink-glitter-lips", "Labios rosa glitter", "Brillos", 155, 827, 310, 220);
add(3, "pink-camera", "Cámara digital rosa", "Accesorios", 462, 827, 322, 226);
add(3, "pink-monkey", "Mono rosa", "Personajes", 0, 905, 200, 310);
add(3, "suck-at-life", "I suck at life", "Textos", 258, 1045, 415, 152);
add(3, "sleeping-bear", "Osito dormido", "Personajes", 675, 1050, 286, 140);
add(3, "kitty-glitter", "Hello Kitty glitter", "Personajes", 847, 954, 211, 150);
add(3, "leopard-heart-pink", "Corazón leopardo fucsia", "Brillos", 0, 1235, 218, 199);
add(3, "love-note", "Mensaje cuddle", "Accesorios", 228, 1196, 377, 263);
add(3, "pink-cd", "Disco Bratz rosa", "Música", 607, 1194, 259, 252);
add(3, "kuromi", "Kuromi", "Personajes", 825, 1193, 233, 243);

const catalog = [];
// A crop can include an edge from the next sticker in these tightly packed sheets.
// Keep the main alpha component; multipart artwork keeps its intentional pieces.
const multipart = new Map([["bunny-duo", 2], ["butterfly", 2], ["message-phone", Infinity], ["bite-me", Infinity], ["i-love-me", 4], ["pink-exclamation", 4], ["cute-100", Infinity], ["pink-equalizer", Infinity], ["juicy", Infinity]]);
// These silhouettes separate touching neighbors without changing the sticker pixels.
const clips = {
  "bunny-banknote": [[604, 40], [787, 40], [787, 177], [604, 177]],
  "pink-batman": [[187, 157], [376, 157], [377, 249], [344, 279], [237, 279], [187, 249]],
  "kitty-leopard-gold": [[37, 275], [283, 275], [283, 389], [250, 394], [240, 467], [37, 467]],
  "pink-paw": [[269, 397], [325, 397], [338, 415], [366, 423], [380, 453], [370, 481], [341, 489], [264, 470], [247, 444], [247, 420]],
  "kitty-leopard-head": [[430, 412], [485, 408], [514, 350], [580, 350], [626, 404], [665, 444], [665, 510], [614, 561], [514, 574], [470, 542], [448, 501]],
  "monster-claws": [[48, 447], [151, 447], [179, 479], [179, 623], [48, 623]],
  "betty-leopard-heart": [[343, 491], [405, 491], [440, 511], [473, 529], [468, 564], [385, 623], [343, 563]],
  "pink-cherries-banner": [[390, 613], [425, 581], [502, 578], [548, 600], [563, 617], [525, 655], [450, 675], [391, 649]],
  "gangsta-girl": [[552, 599], [579, 573], [672, 573], [725, 610], [709, 655], [633, 699], [566, 658]],
  "bite-me": [[340, 668], [550, 668], [553, 691], [601, 679], [601, 794], [340, 794]],
  "circuit-heart": [[155, 915], [206, 904], [260, 919], [310, 912], [350, 957], [330, 1020], [258, 1107], [213, 1107], [154, 1025], [139, 960]],
  "puma-heart": [[344, 913], [504, 913], [504, 995], [428, 1074], [344, 995]],
  "monster-high": [[38, 1121], [300, 1121], [300, 1290], [102, 1290], [102, 1281], [38, 1281]],
  "pink-glitter-star": [[292, 1060], [400, 1108], [463, 1053], [454, 1132], [526, 1176], [458, 1216], [428, 1300], [372, 1235], [277, 1240], [334, 1172]],
  "bunny-skull-tiara": [[494, 1049], [509, 1019], [556, 1019], [586, 1104], [604, 1089], [622, 978], [691, 978], [727, 1046], [715, 1112], [731, 1167], [756, 1278], [471, 1293], [471, 1220], [498, 1185], [501, 1131]],
  "pink-dragon-crest": [[32, 1290], [215, 1290], [236, 1329], [232, 1449], [32, 1449]],
  "cage-crown": [[359, 1295], [510, 1295], [517, 1358], [510, 1448], [359, 1448]],
  "pink-bow": [[545, 1290], [576, 1264], [644, 1264], [686, 1293], [702, 1355], [686, 1419], [628, 1470], [555, 1425], [508, 1395], [517, 1339]],
  "message-phone": [[38, 245], [142, 245], [168, 255], [185, 270], [244, 297], [247, 342], [221, 349], [240, 405], [198, 430], [151, 386], [147, 450], [38, 450]],
  "zebra-pink-star": [[304, 189], [327, 251], [405, 242], [363, 300], [372, 378], [307, 337], [240, 378], [257, 304], [215, 273], [281, 263]],
  "planet": [[4, 260], [74, 256], [92, 210], [138, 216], [153, 255], [174, 275], [187, 294], [158, 317], [81, 308], [4, 283]],
  "crown": [[483, 600], [510, 549], [570, 537], [609, 478], [645, 520], [673, 535], [711, 553], [754, 598], [735, 658], [505, 658]],
  "pink-tamagotchi": [[282, 410], [344, 410], [353, 441], [424, 461], [453, 515], [483, 572], [483, 646], [445, 670], [409, 655], [380, 642], [288, 650], [239, 607], [239, 539], [256, 466]],
  "chrome-star": [[906, 778], [932, 850], [958, 873], [1028, 890], [953, 915], [931, 951], [917, 991], [890, 946], [865, 920], [789, 899], [851, 879], [877, 849]],
  "pink-monkey": [[0, 905], [155, 905], [155, 964], [200, 974], [200, 1215], [0, 1215]],
  "pink-glitter-lips": [[185, 874], [278, 827], [341, 827], [424, 870], [465, 935], [447, 1001], [361, 1047], [259, 1035], [155, 983], [172, 938]],
  "sleeping-bear": [[675, 1115], [718, 1103], [746, 1050], [794, 1050], [836, 1096], [879, 1115], [961, 1127], [961, 1163], [908, 1190], [727, 1190], [675, 1157]],
  "kitty-glitter": [[847, 1018], [879, 986], [894, 954], [937, 962], [969, 961], [991, 954], [1028, 971], [1058, 1015], [1058, 1067], [1023, 1104], [883, 1104], [855, 1074]],
};
function inside(x, y, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) result = !result;
  }
  return result;
}
function isolate(data, width, height, keep) {
  const labels = new Int32Array(width * height), queue = new Int32Array(width * height), components = [];
  for (let pixel = 0; pixel < labels.length; pixel++) {
    if (labels[pixel] || data[pixel * 4 + 3] < 8) continue;
    const label = components.length + 1;
    let head = 0, tail = 1;
    queue[0] = pixel; labels[pixel] = label;
    while (head < tail) {
      const current = queue[head++], x = current % width, y = Math.floor(current / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (!labels[next] && data[next * 4 + 3] >= 8) { labels[next] = label; queue[tail++] = next; }
      }
    }
    components.push({ label, area: tail });
  }
  const sorted = components.sort((a, b) => b.area - a.area);
  const allowed = new Set(sorted.slice(0, keep).filter(item => item.area > 12).map(item => item.label));
  for (let pixel = 0; pixel < labels.length; pixel++) if (!allowed.has(labels[pixel])) data[pixel * 4 + 3] = 0;
  return data;
}
for (const row of rows) {
  // Reviewed repairs are authoritative. Never reapply the old coarse masks
  // to these assets when rebuilding the reference catalog.
  const fixed = repaired.get(row.kind);
  if (fixed) {
    const buffer = await readFile(resolve(destination, basename(fixed.src)));
    if (createHash("sha256").update(buffer).digest("hex") !== fixed.repair.sha256) throw new Error(`Repaired sticker changed: ${row.kind}. Review before packaging.`);
    const meta = await sharp(buffer).metadata();
    catalog.push({ ...row, src: fixed.src, width: meta.width, height: meta.height, bytes: buffer.length, repair: fixed.repair });
    continue;
  }
  const source = resolve(sourceDirectory, `sheet-${row.sheet}.png`);
  const cleaned = row.kind === "pink-card" || row.kind === "kuromi";
  const filename = cleaned ? `${row.kind}-clean.webp` : `${row.kind}.webp`;
  const assetPath = resolve(destination, filename);
  // Package the selected alpha components without substituting drawn artwork.
  const { data, info } = await sharp(await readFile(source)).extract(row.box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const polygon = clips[row.kind];
  if (polygon) for (let pixel = 0; pixel < info.width * info.height; pixel++) {
    const x = row.box.left + pixel % info.width, y = row.box.top + Math.floor(pixel / info.width);
    if (!inside(x, y, polygon)) data[pixel * 4 + 3] = 0;
  }
  const cutout = cleaned
    ? await readFile(resolve(sourceDirectory, `${row.kind}-clean.png`))
    : await sharp(isolate(data, info.width, info.height, multipart.get(row.kind) ?? 1), { raw: info }).png().toBuffer();
  const buffer = await sharp(cutout).trim({ threshold: 8 }).resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true }).webp({ lossless: true }).toBuffer();
  await writeFile(assetPath, buffer);
  const meta = await sharp(buffer).metadata();
  catalog.push({ ...row, src: `/websites/pink-y2k/stickers/${filename}`, width: meta.width, height: meta.height, bytes: buffer.length });
}
const categories = ["Personajes", "Brillos", "Textos", "Música", "Accesorios"];
const code = `// Reference cutouts supplied by the customer. See the packaging manifest for provenance.\nexport const STICKER_CATEGORIES = ${JSON.stringify(categories)} as const;\nexport const REFERENCE_STICKERS = [\n${catalog.map(({ kind, name, category, src }) => `  ${JSON.stringify({ kind, name, category, src })},`).join("\n")}\n] as const;\n`;
await writeFile(resolve("src/websites/templates/pink-y2k/reference-stickers.ts"), code);
await writeFile(resolve(destination, "manifest.json"), JSON.stringify({ method: "Built-in ImageGen background-extraction followed by lossless WebP asset packaging", prompt: "Remove only white whitespace and screenshot UI; preserve every sticker, logo, character, texture, lettering and intentional white inside artwork. Keep relative composition and true alpha transparency.", cleanupPrompts: { pinkCard: "Remove the black screenshot magnifier circle, sparkle and handle from the pink UNO card. Reconstruct occluded pink background and real white reverse arrows. Preserve the corner arrows, oval, shape, colors and transparent background.", kuromi: "Extract the full original Kuromi silhouette, remove the gray expand overlay and the black zoom circle and handle. Remove every background rectangle. Reconstruct the small white feet behind the magnifier and keep the real tail, face, pose, colors and alpha." }, sheets: ["codex-clipboard-ad1a1c48-8d85-4bf0-a1b5-2fd567ef2b57.png", "codex-clipboard-08d71123-eda4-43f4-9195-8f66314ef9c6.png", "codex-clipboard-e08ad23d-216b-43ef-9617-e077feaa2fd0.png"], repairs: priorManifest?.repairs, assets: catalog }, null, 2));
console.log(JSON.stringify({ count: catalog.length, bytes: catalog.reduce((total, art) => total + art.bytes, 0), destination }));
