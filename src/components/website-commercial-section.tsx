import Link from "next/link";
import Image from "next/image";

export function WebsiteCommercialSection({ home = false, enabled: _enabled }: { home?: boolean; enabled?: boolean }) {
  void _enabled;
  return (
    <section id="sitio-web" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 py-12" aria-labelledby="website-title">
      <div className="grid items-center gap-8 rounded-3xl border-4 border-black bg-white p-6 text-black shadow-[6px_6px_0_#000] sm:p-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6D28D9]">Incluido en Puragenda+</p>
          <h2 id="website-title" className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Un sitio web con la identidad de tu negocio.</h2>
          <p className="mt-4 text-base font-bold leading-7 text-black/75">Presenta tus servicios y profesionales y recibe reservas desde un sitio que editas y publicas en Puragenda.</p>
          <ul className="mt-5 grid gap-3 text-sm font-bold sm:grid-cols-2">
            {["Editor y plantillas personalizables", "Hosting y SSL", "Subdominio Puragenda", "Reservas integradas"].map((item) => <li key={item}>✓ {item}</li>)}
          </ul>
          <p className="mt-5 text-sm font-bold leading-6 text-black/70">Puedes conectar un dominio propio. La compra del dominio no está incluida.</p>
          {home && <Link href="/puragenda-plus" className="mt-5 inline-flex min-h-11 items-center rounded-xl border-3 border-black bg-[#E9D8FF] px-4 py-2 font-black shadow-[3px_3px_0_#000]">Conocer Puragenda+ →</Link>}
        </div>
        <div className="min-w-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[{ key: "bella", name: "Bella" }, { key: "matchday", name: "Matchday" }, { key: "ritual", name: "Ritual" }].map((template) => <a key={template.key} href={`/websites/previews/${template.key}.svg`} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar vista de la plantilla ${template.name}`} className="min-w-0 overflow-hidden rounded-xl border-2 border-black bg-white shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]">
              <Image src={`/websites/previews/${template.key}.svg`} width={300} height={400} alt={`Vista de la plantilla ${template.name}`} className="aspect-[3/4] w-full object-cover object-top" />
              <span className="block px-2 py-3 text-center text-xs font-black sm:text-sm">{template.name} ↗</span>
            </a>)}
          </div>
          <p className="mt-4 text-center text-xs font-bold leading-5">Amplía las vistas de las plantillas y elige la que va con tu negocio.</p>
        </div>
      </div>
    </section>
  );
}
