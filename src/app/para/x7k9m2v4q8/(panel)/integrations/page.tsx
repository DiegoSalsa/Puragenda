import { requireSuperAdminSession } from "@/server/auth/admin-session";
import { mcpEnabled } from "@/server/mcp/config";
import { getMcpRolloutState, mcpReviewBusinessIds, mcpReviewUserIds } from "@/server/mcp/rollout";
import { McpRolloutControl } from "./rollout-control";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireSuperAdminSession();
  const state = await getMcpRolloutState();
  return <main className="space-y-6 p-6 lg:p-10">
    <div><h1 className="text-3xl font-black uppercase text-black">Integraciones</h1><p className="mt-2 text-sm font-medium text-black/70">Control de disponibilidad de ChatGPT y Codex.</p></div>
    <McpRolloutControl backendEnabled={mcpEnabled()} businessAccessEnabled={state.businessAccessEnabled} version={state.version} approvalReference={state.approvalReference ?? ""} />
    <section className="space-y-2 border-2 border-black bg-white p-5 text-sm text-black">
      <h2 className="font-black">Acceso de revisión</h2>
      <p>Las cuentas de revisión pueden probar la integración mientras los negocios permanecen deshabilitados.</p>
      <p>Cuentas configuradas: {mcpReviewUserIds().length}. Negocios de prueba configurados: {mcpReviewBusinessIds().length}.</p>
      <p>La validación y publicación en OpenAI se gestionan por separado. Este panel no solicita ni acredita una aprobación de OpenAI.</p>
    </section>
  </main>;
}
