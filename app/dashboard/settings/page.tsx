import { getCurrentSessionUser } from "@/backend/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/backend/services/business.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Key, Link2, Code2 } from "lucide-react";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Debes iniciar sesion para acceder a configuracion
      </div>
    );
  }

  const business = await getFirstBusinessByOwnerId(user.id);

  if (!business) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No tienes un negocio configurado aun
      </div>
    );
  }

  const widgetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/widget/${business.slug}`;
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="700" frameborder="0" style="border-radius: 12px; border: 1px solid #333;"></iframe>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Datos de integración del negocio.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Slug */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-white" />
              Slug del Negocio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-2.5 rounded-lg bg-muted/50 border border-border/50 font-mono text-sm">
                {business.slug}
              </div>
              <CopyButton text={business.slug} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Identificador único del negocio usado en URLs y API.
            </p>
          </CardContent>
        </Card>

        {/* API Key */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-white" />
              API Key
              <Badge variant="secondary" className="border-violet-400/35 bg-violet-700/20 text-xs text-white">
                Secreta
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-2.5 rounded-lg bg-muted/50 border border-border/50 font-mono text-sm break-all">
                {business.apiKey}
              </div>
              <CopyButton text={business.apiKey} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Clave secreta para autenticar peticiones del widget. Envíala en el
              header <code className="text-white">x-api-key</code>.
            </p>
          </CardContent>
        </Card>

        {/* Widget URL */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="w-4 h-4 text-white" />
              Código de Embebido (iframe)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex-1 px-4 py-3 rounded-lg bg-muted/50 border border-border/50 font-mono text-xs break-all leading-relaxed">
                {iframeCode}
              </div>
              <CopyButton text={iframeCode} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Copia e inserta este código en cualquier página HTML para mostrar
              el widget de reservas.
            </p>
          </CardContent>
        </Card>

        {/* Widget Preview */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Previsualización del Widget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <iframe
                src={widgetUrl}
                width="100%"
                height="700"
                style={{ border: "none" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
