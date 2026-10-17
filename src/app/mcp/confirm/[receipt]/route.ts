import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { authorizedContext, type McpIdentity } from "@/server/mcp/access";
import { loadOperation } from "@/server/mcp/operations";
import { publicBusiness } from "@/server/mcp/public";
import { noStore, mcpConfig } from "@/server/mcp/config";
import { digest, secret, McpError, readLimited, requireSameOrigin, limit } from "@/server/mcp/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const headers = { ...noStore, "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "DENY", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" };
const page = (content: string) => new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Revisar operación · Puragenda</title><style>body{margin:0;background:#0b0b10;color:#f5f5f5;font:16px system-ui}main{max-width:520px;margin:7vh auto;padding:28px;border:1px solid #303039;border-radius:20px;background:#141419}img{width:140px}h1{font-size:24px}dt{color:#aaa;margin-top:16px}dd{margin:4px 0;overflow-wrap:anywhere}button{border:0;border-radius:12px;padding:14px 22px;background:#7c3aed;color:white;font-weight:600;cursor:pointer}p{line-height:1.6;color:#ccc}a{color:#c4b5fd}</style><main><img src="/logos/logoPuragendaSVG.svg" alt="Puragenda">${content}</main></html>`, { headers });

async function checked(request: NextRequest, receipt: string) {
  const loaded = await loadOperation(receipt);
  if (loaded.operation.connectionId) {
    const user = await getApiSessionUser(request);
    const connection = await prisma.mcpConnection.findUnique({ where: { id: loaded.operation.connectionId }, include: { profile: true } });
    if (!user || !connection || connection.profile.userId !== user.id) throw new McpError("LOGIN_REQUIRED", 401);
    const identity: McpIdentity = { connection, scopes: connection.scopes };
    await authorizedContext(identity, "appointments:write", String(loaded.payload.request.locationId));
  } else await publicBusiness(loaded.payload.publicSlug!);
  return loaded;
}
export async function GET(request: NextRequest, context: { params: Promise<{ receipt: string }> }) {
  try {
    const { receipt } = await context.params;
    const { operation, payload } = await checked(request, receipt);
    const csrf = secret();
    const s = payload.summary;
    const fields = { Acción: s.action === "cancel" ? "Cancelar cita" : s.action === "reschedule" ? "Reprogramar cita" : "Crear cita",
      Negocio: s.business, Sucursal: s.location, Servicio: s.service, Profesional: s.staffName ?? s.staffId ?? "Agenda del negocio", Cliente: s.customerName ?? "", Inicio: new Date(s.startTime).toLocaleString("es-CL", { timeZone: s.timezone }),
      Fin: new Date(s.endTime).toLocaleString("es-CL", { timeZone: s.timezone }), "Zona horaria": s.timezone, Valor: `${s.price} ${s.currency}` };
    const contact = Object.fromEntries(["customerEmail", "customerPhone", "customerAddress"].filter((key) => typeof payload.request[key] === "string" && payload.request[key]).map((key) => [({ customerEmail: "Email de la reserva", customerPhone: "Teléfono", customerAddress: "Dirección" } as Record<string, string>)[key], String(payload.request[key])]));
    Object.assign(fields, contact);
    const response = page(`<h1>Revisa antes de autorizar</h1><dl>${Object.entries(fields).map(([key, value]) => `<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`).join("")}</dl><p>Esta aprobación permite ejecutar exactamente esta operación durante diez minutos desde su preparación. El horario se comprueba nuevamente al ejecutar.</p>${operation.state === "PREPARED" ? `<form method="post"><input type="hidden" name="csrf" value="${csrf}"><button type="submit" name="approve" value="yes">Aprobar esta operación</button></form>` : "<p>La operación ya fue aprobada o ejecutada. Vuelve al chat para consultar el resultado.</p>"}<p><a href="/politica-de-privacidad">Privacidad</a></p>`);
    response.headers.append("Set-Cookie", `puragenda_mcp_approval=${digest(`${receipt}:${csrf}`)}; Path=/mcp/confirm; HttpOnly; SameSite=Strict; Max-Age=600${mcpConfig().origin.startsWith("https:") ? "; Secure" : ""}`);
    return response;
  } catch (error) {
    if (error instanceof McpError && error.status === 401) return page('<h1>Inicia sesión en Puragenda</h1><p>Para aprobar un cambio privado, abre tu cuenta y vuelve a este enlace.</p><a href="/login" target="_blank" rel="noopener noreferrer">Iniciar sesión</a>');
    return new Response("La operación no está disponible o venció.", { status: 400, headers: noStore });
  }
}
export async function POST(request: NextRequest, context: { params: Promise<{ receipt: string }> }) {
  try {
    requireSameOrigin(request);
    const { receipt } = await context.params;
    await limit(`approval:${digest(receipt)}`, 10);
    const { operation } = await checked(request, receipt);
    const body = new URLSearchParams(await readLimited(request, 2048));
    const csrf = body.get("csrf") || "";
    if (!csrf || body.getAll("csrf").length !== 1 || body.get("approve") !== "yes"
      || request.cookies.get("puragenda_mcp_approval")?.value !== digest(`${receipt}:${csrf}`)) throw new McpError("INVALID_CSRF");
    const result = await prisma.mcpOperation.updateMany({ where: { id: operation.id, state: "PREPARED", expiresAt: { gt: new Date() } }, data: { state: "APPROVED", approvedAt: new Date() } });
    if (!result.count) throw new McpError("OPERATION_UNAVAILABLE", 409);
    const response = new NextResponse(await page("<h1>Operación aprobada</h1><p>Vuelve al chat para ejecutar el cambio y comprobar el resultado. Esta aprobación no significa que la cita ya haya cambiado.</p>").text(), { headers });
    response.cookies.set("puragenda_mcp_approval", "", { path: "/mcp/confirm", maxAge: 0 });
    return response;
  } catch { return new Response("No se pudo aprobar la operación. Inicia la preparación nuevamente.", { status: 403, headers: noStore }); }
}
