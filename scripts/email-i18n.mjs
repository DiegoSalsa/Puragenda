import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = readFileSync(join(root, "src/server/email/templates.ts"), "utf8");
const phrases = new Set();
const ignored = /^(Powered by|Puragenda|Pura|genda|Plan|Email|ID|OK|CSV|[0-9]+\s*(min|hora|visita)|de|al|por|y precios|servicios|profesionales|horarios)$/i;

for (const match of source.matchAll(/>([^<>\n]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡][^<>\n]*)</g)) {
  const phrase = match[1].replace(/\$\{[^}]+\}/g, "{value}").replace(/\s+/g, " ").trim();
  if (phrase.length >= 4 && !phrase.includes("style=") && !phrase.includes("{value}") && !ignored.test(phrase) && !/^[,}:]/.test(phrase)) phrases.add(phrase);
}

for (const match of source.matchAll(/subject:\s*(?:`([^`]+)`|"([^"]+)"|'([^']+)')/g)) {
  const raw = match[1] || match[2] || match[3] || "";
  for (const part of raw.split(/\$\{[^}]+\}/)) {
    const phrase = part.replace(/^[\s—:¡!¿?]+|[\s—:¡!¿?]+$/g, "").trim();
    if (phrase.length >= 4 && !ignored.test(phrase)) phrases.add(phrase);
  }
}

[
  "Todo en un solo lugar", "Ver mis citas y premios →", "Acceso privado de un solo uso · válido por 30 días",
  "Fecha", "Hora", "Zona horaria", "Servicio", "Profesional", "Teléfono del cliente", "Dirección de la visita",
  "Ubicación", "Ver en Google Maps →", "Agregar a Google Calendar", "Cliente", "Estado", "Motivo", "Comentarios",
  "Revisa tu dashboard para confirmar o gestionar esta cita.", "Revisa tu agenda para más detalles.",
  "ha solicitado una cita.", "Se ha agendado una cita con", "hemos recibido su solicitud de reserva en",
  "su cita en", "ha sido agendada exitosamente.", "le informamos que su cita en", "ha sido cancelada.",
  "te recordamos que mañana tienes una cita en", "Puede administrar esta reserva con las opciones seguras disponibles a continuación.",
  "Si necesita cancelar o reprogramar su cita, por favor contacte directamente a", "Por seguridad, cancelar requiere una confirmación adicional y nunca ocurre al abrir el enlace.",
  "Reagendar cita →", "Cancelar cita", "Confirmar asistencia", "Ver mi agenda", "Ir al Dashboard →",
].forEach((phrase) => phrases.add(phrase));

const idFor = (text) => createHash("sha256").update(text).digest("base64url").slice(0, 12);
const es = Object.fromEntries([...phrases].sort().map((text) => [idFor(text), text]));
const directory = join(root, "messages", "email"); mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "es.json"), JSON.stringify(es, null, 2) + "\n");

async function translateOne(text, target) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx"); url.searchParams.set("sl", "es"); url.searchParams.set("tl", target); url.searchParams.set("dt", "t"); url.searchParams.set("q", text);
  const response = await fetch(url); if (!response.ok) throw new Error(String(response.status));
  const payload = await response.json(); return payload[0].map((part) => part[0]).join("").trim();
}

for (const [locale, target] of Object.entries({ en:"en", it:"it", pt:"pt", fr:"fr", de:"de", "zh-CN":"zh-CN" })) {
  const output = {}; const entries = Object.entries(es);
  for (let index = 0; index < entries.length; index += 8) {
    const group = entries.slice(index, index + 8);
    const values = await Promise.all(group.map(([, text]) => translateOne(text, target)));
    group.forEach(([id, text], item) => { output[id] = values[item] || text; });
  }
  writeFileSync(join(directory, `${locale}.json`), JSON.stringify(output, null, 2) + "\n");
}
console.log(`Email phrases: ${Object.keys(es).length}`);
