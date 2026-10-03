import Link from "next/link";
import { publicWebsiteMonthly } from "@/websites/commercial";

export function WebsiteCommercialSection({ home = false, enabled = false }: { home?: boolean; enabled?: boolean }) {
  const price = new Intl.NumberFormat("es-CL").format(publicWebsiteMonthly);
  return <section id="sitio-web" aria-labelledby={home ? "website-home-title" : "website-pricing-title"} className="mx-auto my-12 w-full max-w-6xl px-4 sm:px-6">
    <div className="overflow-hidden rounded-[2rem] border-4 border-black bg-[#FFF5BA] text-black shadow-[8px_8px_0_#000]">
      <div className="grid gap-8 p-5 sm:p-9 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="mb-4 inline-block rounded-lg border-2 border-black bg-[#BFFCC6] px-3 py-1 text-sm font-black uppercase">Agenda + página web</p>
          <h2 id={home ? "website-home-title" : "website-pricing-title"} className="text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl">{home ? "Tu agenda y tu página web, trabajando juntas" : "¿También necesitas página web?"}</h2>
          <p className="mt-4 text-lg font-bold">Presenta tus servicios y profesionales, usa tu identidad y recibe reservas en un sitio que administras y publicas desde Puragenda.</p>
          <p className="mt-6 text-2xl font-black">Sitio Web Puragenda <span className="block">+${price} CLP/mes</span></p>
          <ul className="mt-4 grid gap-2 text-sm font-bold sm:grid-cols-2">
            {["Editor y 3 templates", "Hosting y SSL", "Subdominio Puragenda", "Reservas integradas"].map(item => <li key={item}>✓ {item}</li>)}
          </ul>
          <p className="mt-4 text-sm font-bold">Dominio propio compatible mediante el flujo de conexión del dashboard. La compra del dominio no está incluida.</p>
          <p className="mt-3 text-sm font-bold">El sitio web es un complemento de tu plan Puragenda y se factura por separado. Son dos suscripciones recurrentes independientes.</p>
          {!enabled && <p className="mt-4 rounded-lg border-2 border-black bg-white p-3 text-sm font-bold">Contratación pública del sitio próximamente. Puedes comenzar con la prueba de Puragenda; el sitio no se cobra ni activa durante esa prueba.</p>}
          {home && <Link href="/pricing#sitio-web" className="mt-6 inline-block rounded-xl border-4 border-black bg-[#FFB5E8] px-4 py-3 font-black shadow-[4px_4px_0_#000]">Ver Puragenda + Sitio Web →</Link>}
        </div>
        <div className="min-w-0">
          <div className="mb-5 flex items-center justify-between rounded-xl border-4 border-black bg-[#85E3FF] p-3 font-black"><span>Tu agenda</span><span aria-hidden="true">↔</span><span>Tu sitio web</span></div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[{ key: "bella", name: "Bella" }, { key: "matchday", name: "Matchday" }, { key: "ritual", name: "Ritual" }].map(template => <Link key={template.key} href={`/website-preview?template=${template.key}`} className="min-w-0 overflow-hidden rounded-xl border-2 border-black bg-white shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-1">
              <div className="border-b-2 border-black bg-black px-2 py-1 text-[10px] font-bold text-white">Vista de template</div>
              {/* Existing product previews, never presented as customer websites. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/websites/previews/${template.key}.svg`} alt={`Template ${template.name} de Sitio Web Puragenda`} className="aspect-[3/4] w-full object-cover object-top" />
              <span className="block px-2 py-3 text-center text-xs font-black sm:text-sm">{template.name} ↗</span>
            </Link>)}
          </div>
          <p className="mt-4 text-center text-xs font-bold">Explora los 3 templates reales. Tú eliges el contenido y publicas tu sitio.</p>
        </div>
      </div>
    </div>
  </section>;
}
