import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db/prisma";
import { revokeMcpConnection, updateMcpPublicDiscovery } from "@/server/actions/mcp.actions";
import { mcpEnabled } from "@/server/mcp/config";

export async function McpConnections({ userId, businessId, owner, publicDiscovery }: { userId: string; businessId: string; owner: boolean; publicDiscovery: boolean }) {
  if (!mcpEnabled()) return null;
  const t = await getTranslations("mcp");
  const connections = await prisma.mcpConnection.findMany({ where: { profile: { businessId, ...(!owner ? { userId } : {}) }, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { client: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <section className="space-y-5 rounded-2xl border border-border bg-card p-6" id="chatgpt-connection">
    <div><h2 className="text-lg font-semibold">{t("title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("description")}</p></div>
    <Link className="text-sm font-medium text-brand-foreground underline" href="/integraciones/chatgpt">{t("instructions")}</Link>
    <div className="space-y-3">{connections.length ? connections.map((c) => <div key={c.id} className="rounded-xl border border-border p-4"><p className="font-medium">{c.client.name}</p><p className="mt-1 text-xs text-muted-foreground">{c.scopes.map((s) => t(`scopes.${s}`)).join(" · ")}</p><form action={revokeMcpConnection} className="mt-3"><input type="hidden" name="connectionId" value={c.id} /><button className="rounded-lg border border-border px-3 py-2 text-sm">{t("revoke")}</button></form></div>) : <p className="text-sm text-muted-foreground">{t("empty")}</p>}</div>
    <form action={updateMcpPublicDiscovery} className="space-y-3 border-t border-border pt-4"><label className="flex gap-3 text-sm"><input type="checkbox" name="enabled" defaultChecked={publicDiscovery} className="mt-1 h-4 w-4 accent-[#7C3AED]" /><span>{t("publicConsent")}<span className="mt-1 block text-xs text-muted-foreground">{t("publicDetails")}</span></span></label><button className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white">{t("save")}</button></form>
  </section>;
}
