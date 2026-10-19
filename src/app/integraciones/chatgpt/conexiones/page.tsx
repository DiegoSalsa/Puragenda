import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { revokeMcpConnection } from "@/server/actions/mcp.actions";
import { mcpEnabled } from "@/server/mcp/config";
import { mcpUserAllowed, mcpBusinessFilter } from "@/server/mcp/rollout";
export const dynamic = "force-dynamic";
export const metadata = { title: "Conexiones autorizadas · Puragenda", robots: { index: false, follow: false } };
export default async function ConnectionsPage() {
  if (!mcpEnabled()) notFound();
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  if (!await mcpUserAllowed(user.id)) notFound();
  const t = await getTranslations("mcp");
  const connections = await prisma.mcpConnection.findMany({ where: { profile: { userId: user.id, business: await mcpBusinessFilter() }, revokedAt: null, expiresAt: { gt: new Date() } }, include: { client: { select: { name: true } }, profile: { select: { business: { select: { name: true } } } } }, take: 100, orderBy: { createdAt: "desc" } });
  return <main className="mx-auto max-w-xl space-y-6 px-6 py-16"><h1 className="text-2xl font-bold">{t("connections")}</h1>{connections.length ? connections.map((c) => <section key={c.id} className="space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">{c.profile.business.name} · {c.client.name}</h2><p className="text-sm text-muted-foreground">{c.scopes.map((s) => t(`scopes.${s}`)).join(" · ")}</p><form action={revokeMcpConnection}><input type="hidden" name="connectionId" value={c.id} /><button className="rounded-xl border border-border px-4 py-2 text-sm">{t("revoke")}</button></form></section>) : <p>{t("empty")}</p>}</main>;
}
