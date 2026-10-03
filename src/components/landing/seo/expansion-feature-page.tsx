import { LandingLayout } from "../landing-layout";
import { JsonLd } from "@/components/json-ld";
import { LandingHero } from "./landing-hero";
import { LandingCtaGroup } from "./landing-cta-group";
import { ProductFrame } from "./product-frame";
import { seo } from "./styles";
import { ExpansionFaq, ExpansionLinks } from "./expansion-content";
import type { FeatureSolution } from "@/lib/data/feature-solutions";
import type { FeatureDetail } from "@/lib/data/expansion-features";
import { expansionSchema } from "@/lib/seo-expansion";

function FeaturePreview({ detail }: { detail: FeatureDetail }) {
  const rows = detail.previewRows;
  const content = detail.preview === "gift" ? (
    <div className="rounded-2xl border-2 border-black bg-[#FFD6F0] p-6 text-black">
      <p className="text-xs font-black uppercase tracking-widest">Gift Card · ejemplo</p>
      <p className="mt-5 text-3xl font-black">Un momento para ti</p>
      <dl className="mt-6 space-y-4">{rows.map((row) => <div key={row.label}><dt className="text-xs font-bold">{row.label}</dt><dd className="mt-1 font-semibold">{row.value}</dd></div>)}</dl>
    </div>
  ) : detail.preview === "locations" ? (
    <div className="space-y-4">{rows.map((row, i) => <div key={row.label} className={"rounded-xl border-2 border-black p-4 text-black " + (i === 1 ? "bg-[#BFFCC6]" : "bg-[#FFF5BA]")}>
      <p className="font-black">{row.label}</p><p className="mt-2 text-sm leading-6">{row.value}</p>
    </div>)}</div>
  ) : detail.preview === "embed" ? (
    <div className="space-y-4">
      <p className="rounded-lg bg-[#F3E8FF] p-3 text-sm font-bold text-black">Tu página de servicios</p>
      <div className="rounded-xl border-2 border-dashed border-[#7C3AED] p-4">
        <p className="text-sm font-black">Agenda embebida</p>
        <ol className="mt-4 space-y-3">{rows.map((row) => <li key={row.label} className="text-sm leading-6"><strong>{row.label}</strong><span className="block">{row.value}</span></li>)}</ol>
      </div>
      <p className="break-all rounded-lg bg-[#222] p-3 font-mono text-xs text-white">{'<iframe title="Reservar una cita" src="URL del widget">'}</p>
    </div>
  ) : detail.preview === "guest" ? (
    <ol className="space-y-4">{rows.map((row) => <li key={row.label} className="rounded-lg border-2 border-black/20 p-4 dark:border-white/20">
      <p className="text-sm font-black text-[#6D28D9] dark:text-[#C4B5FD]">{row.label}</p><p className="mt-2 text-sm leading-6">{row.value}</p>
    </li>)}</ol>
  ) : (
    <div className="space-y-5"><p className="border-b-2 border-black/15 pb-4 text-xl font-black dark:border-white/20">Tu próxima cita</p>
      <dl className="space-y-4">{rows.map((row) => <div key={row.label}><dt className="text-xs font-black uppercase opacity-65">{row.label}</dt><dd className="mt-1 font-semibold">{row.value}</dd></div>)}</dl>
      <p className="rounded-md bg-[#E9D5FF] p-3 text-sm font-bold text-black">Confirmar o cancelar desde el correo</p>
    </div>
  );
  return <ProductFrame label={detail.previewTitle} caption="Esquema ilustrativo del recorrido; no es una reserva real." tone={detail.preview === "gift" ? "pink" : "cream"}>{content}</ProductFrame>;
}

export function ExpansionFeaturePage({ solution, detail }: { solution: FeatureSolution; detail: FeatureDetail }) {
  const path = "/funciones/" + solution.slug;
  const placement = "feature_" + solution.slug;
  return <LandingLayout>
    <JsonLd data={expansionSchema({ path, title: solution.title, description: solution.description, date: detail.updatedAt, faq: solution.faq, parent: { name: "Características", path: "/caracteristicas" } })} />
    <div data-seo-content={solution.slug} data-seo-cluster="feature">
      <LandingHero breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Características", href: "/caracteristicas" }, { label: solution.title.replace(" | Puragenda", "") }]}
        eyebrow={solution.eyebrow} h1={solution.headline} lead={<p>{solution.description}</p>}
        tone={detail.preview === "gift" ? "pink" : detail.preview === "locations" ? "mint" : "cyan"}
        primaryCta={{ href: "/register?trial=1", label: "Configurar mi agenda", cta: "register", placement }}
        secondaryCta={{ href: "/demo", label: "Ver demo", cta: "demo", placement }}
        visual={<FeaturePreview detail={detail} />} />
      <section className={seo.band} aria-labelledby="answer-heading">
        <div className={seo.section}><p className={seo.kicker}>Respuesta directa</p><h2 id="answer-heading" className="mt-3 text-2xl font-black">Qué permite este recorrido</h2><p className={seo.body + " mt-4 max-w-4xl"}>{solution.directAnswer}</p></div>
      </section>
      <section className={seo.section}>
        <h2 className={seo.h2}>Qué puedes gestionar</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">{solution.benefits.map((item) => <article key={item.title} className={seo.panel + " min-w-0 p-6"}>
          <h3 className={seo.h3}>{item.title}</h3><p className={seo.body + " mt-4 text-base"}>{item.description}</p>
        </article>)}</div>
      </section>
      <section className={seo.bandWarm}>
        <div className={seo.section}><h2 className={seo.h2}>Del panel a la reserva</h2>
          <ol className="mt-9 grid gap-7 md:grid-cols-3">{solution.steps.map((step, i) => <li key={step.title} className="min-w-0">
            <span className="text-4xl font-black text-[#6D28D9] dark:text-[#C4B5FD]">{i + 1}</span><h3 className={seo.h3 + " mt-3"}>{step.title}</h3><p className={seo.body + " mt-3"}>{step.description}</p>
          </li>)}</ol>
        </div>
      </section>
      <div className={seo.section + " grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"}>
        <div className="min-w-0 space-y-12">{detail.sections.map((section) => <section key={section.heading}>
          <h2 className={seo.h2 + " text-2xl sm:text-3xl"}>{section.heading}</h2><div className="mt-5 space-y-4">{section.paragraphs.map((p) => <p key={p} className={seo.body}>{p}</p>)}</div>
        </section>)}</div>
        <aside className="min-w-0 self-start rounded-2xl border-2 border-black bg-[#BFFCC6] p-6 text-black shadow-[5px_5px_0_#000] lg:sticky lg:top-28">
          <p className="text-xs font-black uppercase tracking-widest">Caso ilustrativo</p><h2 className="mt-4 text-2xl font-black">{detail.example.heading}</h2>
          {detail.example.paragraphs.map((p) => <p key={p} className="mt-4 text-base font-medium leading-7">{p}</p>)}
        </aside>
      </div>
      <ExpansionFaq items={solution.faq} />
      <ExpansionLinks links={detail.links} />
      <section className={seo.band}><div className={seo.section}>
        <h2 className={seo.h2}>{detail.cta.heading}</h2><p className={seo.body + " mt-5 max-w-3xl"}>{detail.cta.description}</p>
        <LandingCtaGroup className="mt-7" primary={{ href: "/demo", label: detail.cta.label, cta: "demo", placement: placement + "_final" }} secondary={{ href: "/pricing", label: "Consultar planes", cta: "pricing", placement: placement + "_final" }} />
      </div></section>
    </div>
  </LandingLayout>;
}
