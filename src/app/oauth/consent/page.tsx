import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { authorizationRequest } from "@/server/mcp/oauth";
import { oauthCookie, SCOPES, type McpScope } from "@/server/mcp/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conectar Puragenda", robots: { index: false, follow: false } };
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id = "" } = await searchParams;
  const csrf = (await cookies()).get(oauthCookie)?.value || "";
  const request = await authorizationRequest(id, csrf).catch(() => null);
  if (!request) return <main className="mx-auto max-w-lg p-8">La solicitud venció o no es válida. Inicia la conexión nuevamente desde ChatGPT o Codex.</main>;
  const user = await getCurrentSessionUser();
  if (!user) redirect(`/login?mcpRequest=${encodeURIComponent(id)}`);
  const businesses = await prisma.business.findMany({ where: { OR: [{ ownerId: user.id }, { staff: { some: { userId: user.id, isActive: true } } }] }, select: { id: true, name: true }, take: 100 });
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12"><div className="w-full space-y-6 rounded-2xl border border-border bg-card p-6">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda" className="h-14 w-auto" />
    <h1 className="text-2xl font-bold">Conectar tu negocio</h1>
    <p className="text-sm text-muted-foreground">Cliente externo: {request.client.name}. Verifica que sea el cliente desde el que iniciaste la conexión. Cuenta: {user.email}.</p>
    <form method="post" action="/oauth/decision" className="space-y-5">
      <input type="hidden" name="requestId" value={id} /><input type="hidden" name="csrf" value={csrf} />
      <label className="block space-y-2 text-sm">Negocio que autorizas<select required name="businessId" defaultValue="" className="block w-full rounded-xl border border-border bg-background p-3"><option value="" disabled>Selecciona un negocio</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <ul className="list-disc space-y-2 pl-5 text-sm">{request.scopes.map((scope) => <li key={scope}>{SCOPES[scope as McpScope]}</li>)}</ul>
      <p className="text-sm text-muted-foreground">La conexión dura hasta 30 días y respeta tus permisos actuales. Cada cambio de cita exige una aprobación separada en Puragenda. Puedes revocar el acceso en Configuración.</p>
      <a className="text-sm text-brand-foreground underline" href="/politica-de-privacidad">Política de privacidad</a>
      <div className="flex gap-3"><button name="decision" value="approve" disabled={!businesses.length} className="rounded-xl bg-[#7C3AED] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Autorizar</button><button name="decision" value="deny" formNoValidate className="rounded-xl border border-border px-5 py-3 text-sm">Cancelar</button></div>
    </form>
  </div></main>;
}
