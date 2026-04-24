import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { Key, Link2, Code2 } from "lucide-react";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return (
      <div className="py-20 text-center text-white/40">
        Debes iniciar sesión para acceder a configuración
      </div>
    );
  }

  if (user.role !== "OWNER") {
    return (
      <div className="py-20 text-center text-white/40">
        Solo el propietario puede acceder a esta sección
      </div>
    );
  }

  const business = await getFirstBusinessByOwnerId(user.id);

  if (!business) {
    return (
      <div className="py-20 text-center text-white/40">
        No tienes un negocio configurado aún
      </div>
    );
  }

  const widgetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/widget/${business.slug}`;
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="700" frameborder="0" style="border-radius: 16px; border: 1px solid #222;"></iframe>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-white/40">
          Datos de integración del negocio.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Slug */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-[#7C3AED]" />
            Slug del Negocio
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 font-mono text-sm">
              {business.slug}
            </div>
            <CopyButton text={business.slug} />
          </div>
          <p className="mt-2 text-xs text-white/30">
            Identificador único del negocio usado en URLs y API.
          </p>
        </div>

        {/* API Key */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-[#7C3AED]" />
            API Key
            <span className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs text-[#7C3AED]">
              Secreta
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 break-all rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 font-mono text-sm">
              {business.apiKey}
            </div>
            <CopyButton text={business.apiKey} />
          </div>
          <p className="mt-2 text-xs text-white/30">
            Clave secreta para autenticar peticiones del widget. Envíala en el
            header <code className="text-white/60">x-api-key</code>.
          </p>
        </div>

        {/* Iframe Code */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Code2 className="h-4 w-4 text-[#7C3AED]" />
            Código de Embebido (iframe)
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1 break-all rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 font-mono text-xs leading-relaxed">
              {iframeCode}
            </div>
            <CopyButton text={iframeCode} />
          </div>
          <p className="mt-2 text-xs text-white/30">
            Copia e inserta este código en cualquier página HTML para mostrar
            el widget de reservas. Agrega <code className="text-white/60">?color=FF69B4</code> para personalizar colores.
          </p>
        </div>

        {/* Widget Preview */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6">
          <h3 className="mb-4 text-sm font-medium">
            Previsualización del Widget
          </h3>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            <iframe
              src={widgetUrl}
              width="100%"
              height="700"
              style={{ border: "none" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
