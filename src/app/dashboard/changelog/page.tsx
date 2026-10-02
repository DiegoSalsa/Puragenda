import { CHANGELOG_DATA, type ChangelogEntry } from "@/config/changelog";
import { Calendar, CheckCircle2, ChevronDown, ShieldCheck, Sparkles } from "@/components/icons/hover-icons";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import WebsiteChangelogCard from "@/components/dashboard/website-changelog-card";
import { ChangelogAnnouncementButton } from "@/components/dashboard/changelog-announcement-button";

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-CL", options).format(new Date(`${date}T12:00:00`));
}

function EntryDate({ entry, compact = false }: { entry: ChangelogEntry; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-black/55">
      <Calendar className="h-4 w-4" />
      {formatDate(entry.date, compact ? { month: "short", year: "numeric" } : { day: "numeric", month: "long", year: "numeric" })}
    </span>
  );
}

function FeatureList({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${muted ? "text-black/35" : "text-[#7C3AED]"}`} />
          <span className={`text-sm leading-6 ${muted ? "text-black/60" : "text-black/70"}`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LatestEntry({ entry }: { entry: ChangelogEntry }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border-[3px] border-black bg-[#E9D8FF] text-black shadow-[8px_8px_0_#171717]">
      <div className="relative overflow-hidden border-b-[3px] border-black p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full border-[28px] border-[#FF5C8A]/60" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-[#FFD84D] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] shadow-[2px_2px_0_#000]">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={3} /> Última actualización
              </span>
              <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black shadow-[2px_2px_0_#000]">{entry.version}</span>
            </div>
            <h2 className="mt-5 max-w-3xl text-[clamp(2rem,5vw,3.8rem)] font-black leading-[0.98] tracking-[-0.06em]">{entry.title}</h2>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-black/70">{entry.description}</p>
          </div>
          <div className="shrink-0 rounded-2xl border-2 border-black bg-[#FFF5BA] px-4 py-3 shadow-[4px_4px_0_#000]">
            <EntryDate entry={entry} />
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-black/45">Lo que cambió</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 bg-[#FFFAF0] p-5 sm:p-8 lg:p-10">
        {entry.notice && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-black bg-[#FFF5BA] p-4 shadow-[3px_3px_0_#000]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
            <p className="text-sm font-bold leading-6">{entry.notice}</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000] sm:p-6">
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.14em]">Nuevas funcionalidades</h3>
            <FeatureList items={entry.features} />
          </div>
          {entry.fixes && entry.fixes.length > 0 && (
            <div className="rounded-2xl border-2 border-black bg-[#FFB5E8] p-5 shadow-[4px_4px_0_#000] sm:p-6">
              <h3 className="mb-5 text-sm font-black uppercase tracking-[0.14em]">Mejoras y correcciones</h3>
              <FeatureList items={entry.fixes} muted />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HistoricalEntry({ entry }: { entry: ChangelogEntry }) {
  return (
    <details className="group rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0_#000] open:bg-[#FFF5BA]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#E9D8FF] px-2.5 py-1 text-xs font-black text-black">{entry.version}</span>
            <EntryDate entry={entry} compact />
          </span>
          <span className="mt-3 block text-lg font-black leading-tight">{entry.title}</span>
          <span className="mt-2 block text-sm leading-6 text-black/60">{entry.description}</span>
        </span>
        <ChevronDown className="mt-1 h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-5 border-t-2 border-black/15 px-5 pb-5 pt-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-black uppercase tracking-[0.14em]">Nuevas funcionalidades</h3>
          <FeatureList items={entry.features} />
        </div>
        {entry.fixes && entry.fixes.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-[0.14em]">Mejoras y correcciones</h3>
            <FeatureList items={entry.fixes} muted />
          </div>
        )}
      </div>
    </details>
  );
}

export default async function ChangelogPage({ searchParams }: { searchParams: Promise<{ popup?: string | string[] }> }) {
  const openAnnouncement = (await searchParams).popup === "website";
  const enabled = process.env.WEBSITE_LAUNCH_ENABLED === "1";
  const [latest, ...history] = CHANGELOG_DATA;
  const user = enabled ? await getCurrentSessionUser() : null;
  const business = user ? await getBusinessForUser(user.id) : null;
  const context = business ? { offer: await prisma.websiteOfferEligibility.findUnique({ where: { businessId: business.id } }), addon: await prisma.websiteAddon.findUnique({ where: { businessId: business.id } }), canManage: business.ownerId === user?.id } : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 pb-16">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#FFB5E8] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={3} /> Producto en movimiento
        </p>
        <h1 className="mt-5 text-[clamp(2.8rem,7vw,5rem)] font-black leading-[0.92] tracking-[-0.07em] text-black">Novedades que te ayudan a trabajar mejor.</h1>
        <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-muted-foreground">Descubre las últimas mejoras, correcciones y nuevas funcionalidades de Puragenda.</p>
        <ChangelogAnnouncementButton openOnLoad={openAnnouncement} />
      </header>

      <LatestEntry entry={latest} />
      {context ? <WebsiteChangelogCard context={context} /> : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Archivo del producto</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-black">Versiones anteriores</h2>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Abre una versión para ver el detalle completo.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {history.map((entry) => <HistoricalEntry key={entry.version} entry={entry} />)}
        </div>
      </section>
    </div>
  );
}
