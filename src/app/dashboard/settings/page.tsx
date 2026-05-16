import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getBusinessHours } from "@/server/services/businessHours.service";
import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import { Key, Link2, Code2, Clock, Store, ImageIcon, MapPin, Crown, CheckCircle2, AlertCircle, CreditCard, Banknote, RefreshCw } from "lucide-react";
import { CopyButton } from "./copy-button";
import { BusinessHoursEditor } from "./business-hours-editor";
import { BusinessNameEditor } from "./business-name-editor";
import { BusinessLocationEditor } from "./business-location-editor";
import { LogoUploader } from "./logo-uploader";
import { UpgradeButton } from "@/components/dashboard/upgrade-button";
import { MercadoPagoConnect } from "./mercadopago-connect";
import { DepositConfig } from "./deposit-config";
import { BusinessPoliciesEditor } from "./business-policies-editor";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ mp_connected?: string; mp_error?: string }> }) {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return <div className="py-20 text-center text-muted-foreground">Solo el administrador puede acceder a esta sección</div>;
  }

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio configurado aún</div>;

  const [hours, subscription] = await Promise.all([
    getBusinessHours(business.id),
    prisma.subscription.findUnique({ where: { businessId: business.id } }),
  ]);

  const params = await searchParams;
  const mpConnectedSuccess = params.mp_connected === "true";
  const mpError = params.mp_error;

  const isProduction = process.env.NODE_ENV === "production";
  const widgetUrl = isProduction
    ? `https://www.puragenda.cl/widget/${business.slug}`
    : `http://localhost:3000/widget/${business.slug}`;
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="700" frameborder="0" style="border-radius: 16px; border: 1px solid #222;"></iframe>`;

  const planName = subscription?.plan === "EQUIPO" ? "Equipo" : "Individual";
  const planPrice = subscription?.plan === "EQUIPO" ? PRICING.EQUIPO.monthly : PRICING.INDIVIDUAL.monthly;
  const isActive = subscription?.status === "ACTIVE";
  const isTrial = subscription?.isTrial ?? false;
  const showUpgrade = !subscription || subscription.plan === "INDIVIDUAL" || (subscription.plan === "EQUIPO" && isTrial);

  const isMpConnected = !!business.mpAccessToken;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">Datos de integración, horarios y pagos del negocio.</p>
      </div>

      {/* ── MP Connection Success/Error banners ── */}
      {mpConnectedSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          ¡Mercado Pago conectado exitosamente!
        </div>
      )}
      {mpError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-400">
          <AlertCircle className="h-5 w-5" />
          {mpError === "denied" && "No se otorgaron los permisos de Mercado Pago."}
          {mpError === "token_exchange" && "Error al intercambiar el código de autorización."}
          {mpError === "invalid_params" && "Parámetros de respuesta inválidos."}
          {mpError === "invalid_state" && "Estado de seguridad inválido."}
          {mpError === "server_config" && "Error de configuración del servidor."}
          {mpError === "no_token" && "No se recibió un token de acceso."}
          {mpError === "unexpected" && "Error inesperado al conectar Mercado Pago."}
        </div>
      )}

      <div className="grid gap-6">
        {/* ── Plan / Suscripción ── */}
        <div id="plan" className="rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/5 via-card to-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Crown className="h-4 w-4 text-[#7C3AED]" /> Tu Plan
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Plan {planName}</h3>
                {isActive && !isTrial && (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Activo
                  </span>
                )}
                {isTrial && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    <AlertCircle className="h-3 w-3" /> Prueba
                  </span>
                )}
                {subscription?.status === "INACTIVE" && (
                  <span className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    <AlertCircle className="h-3 w-3" /> Inactivo
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ${planPrice.toLocaleString("es-CL")}/mes
                {subscription?.currentPeriodEnd && (
                  <> · Próxima renovación: {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-CL")}</>
                )}
              </p>
            </div>
            {showUpgrade && (
              <div className="w-full sm:w-auto sm:min-w-[220px]">
                <UpgradeButton />
              </div>
            )}
          </div>
        </div>

        {/* ── Mercado Pago Connection ── */}
        <div id="mercadopago" className="rounded-2xl border border-[#009EE3]/20 bg-gradient-to-br from-[#009EE3]/5 via-card to-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-4 w-4 text-[#009EE3]" /> Mercado Pago
          </div>
          <MercadoPagoConnect isConnected={isMpConnected} mpUserId={business.mpUserId} />
        </div>

        {/* ── Deposit / Abono Config ── */}
        <div id="abonos" className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium">
            <Banknote className="h-4 w-4 text-[#7C3AED]" /> Abonos / Depósitos
          </div>
          <DepositConfig
            initialDepositRequired={business.depositRequired}
            isMpConnected={isMpConnected}
          />
        </div>

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
            <MapPin className="h-4 w-4 text-[#7C3AED]" /> Ubicación del Negocio
          </div>
          <BusinessLocationEditor initialAddress={business.address} initialMapsUrl={business.mapsUrl} />
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
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="h-4 w-4 text-[#7C3AED]" /> Politicas de Suscripciones
          </div>
          <BusinessPoliciesEditor
            initialAllowRescheduling={business.allowRescheduling}
            initialRescheduleHoursLimit={business.rescheduleHoursLimit}
            initialRequiresClientRut={business.requiresClientRut}
          />
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
