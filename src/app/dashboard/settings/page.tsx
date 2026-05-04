import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getBusinessHours } from "@/server/services/businessHours.service";
import { Key, Link2, Code2, Clock, Store, ImageIcon } from "lucide-react";
import { CopyButton } from "./copy-button";
import { BusinessHoursEditor } from "./business-hours-editor";
import { BusinessNameEditor } from "./business-name-editor";
import { LogoUploader } from "./logo-uploader";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return <div className="py-20 text-center text-muted-foreground">Solo el administrador puede acceder a esta sección</div>;
  }

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio configurado aún</div>;

  const hours = await getBusinessHours(business.id);
  const widgetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/widget/${business.slug}`;
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="700" frameborder="0" style="border-radius: 16px; border: 1px solid #222;"></iframe>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">Datos de integración y horarios del negocio.</p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Store className="h-4 w-4 text-[#7C3AED]" /> Nombre del Negocio
          </div>
          <BusinessNameEditor initialName={business.name} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="h-4 w-4 text-[#7C3AED]" /> Logo del Negocio
          </div>
          <LogoUploader currentLogoUrl={business.logoUrl} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-[#7C3AED]" /> Horario de Atención
          </div>
          <BusinessHoursEditor initialHours={hours.map((h) => ({
            dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen,
          }))} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-[#7C3AED]" /> Slug del Negocio
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm">{business.slug}</div>
            <CopyButton text={business.slug} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-[#7C3AED]" /> API Key
            <span className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs text-[#7C3AED]">Secreta</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 break-all rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm">{business.apiKey}</div>
            <CopyButton text={business.apiKey} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Code2 className="h-4 w-4 text-[#7C3AED]" /> Código de Embebido
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1 break-all rounded-xl border border-border bg-muted px-4 py-3 font-mono text-xs leading-relaxed">{iframeCode}</div>
            <CopyButton text={iframeCode} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Agrega <code className="text-foreground/60">?color=HEX</code> para personalizar colores.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-medium">Previsualización del Widget</h3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe src={widgetUrl} width="100%" style={{ border: "none", height: "min(90vh, 700px)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
