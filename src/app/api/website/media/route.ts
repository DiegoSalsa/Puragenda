import { requireWebsiteManager } from "@/server/websites/service";
import { storeWebsiteImage } from "@/server/websites/media";
import { WebsiteError } from "@/server/websites/errors";
export const runtime = "nodejs";
const MAX_BODY = 6 * 1024 * 1024;
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  const expectedOrigin = `${requestUrl.protocol}//${host}`;
  if (request.headers.get("origin") !== expectedOrigin) return Response.json({ error: "Solicitud no autorizada" }, { status: 403 });
  try {
    await requireWebsiteManager();
    const reader = request.body?.getReader(); if (!reader) throw new WebsiteError("Selecciona una foto");
    let length = 0; const chunks: Uint8Array[] = [];
    while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > MAX_BODY) { await reader.cancel(); return Response.json({ error: "Usa una foto de hasta 5 MB" }, { status: 413 }); } chunks.push(chunk.value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const asset = await storeWebsiteImage(form);
    return Response.json({ asset }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof WebsiteError ? error.message : "No pudimos subir la foto. Intenta nuevamente.";
    const status = message === "No autenticado" ? 401 : message === "No autorizado" ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
