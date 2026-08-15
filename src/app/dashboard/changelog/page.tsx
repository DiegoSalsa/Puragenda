
import { LocalizedText } from "@/components/i18n/localized-text";
import { CHANGELOG_DATA } from "@/config/changelog";
import { Sparkles, Calendar, CheckCircle2, ShieldCheck } from "lucide-react";

export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight"><LocalizedText id="LPKEuQgC4a6c" /></h1>
        <p className="text-muted-foreground mt-2"><LocalizedText id="Hu__nLwfZD5k" /></p>
      </div>

      <div className="max-w-3xl space-y-12 pb-12 mt-6">
        {CHANGELOG_DATA.map((entry, idx) => (
          <div key={entry.version} className="relative pl-8 sm:pl-32">
            {/* Timeline line */}
            {idx !== CHANGELOG_DATA.length - 1 && (
              <div className="absolute left-[11px] sm:left-[107px] top-8 bottom-[-48px] w-px bg-border" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-0 sm:left-[96px] top-2 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm">
              <Sparkles className="h-3 w-3 text-brand-foreground" />
            </div>

            {/* Date (Desktop) */}
            <div className="hidden sm:block absolute left-0 top-2 w-20 text-right">
              <span className="text-sm font-medium text-muted-foreground">
                {new Date(entry.date).toLocaleDateString("es-ES", {
                  month: "short",
                  year: "numeric"
                })}
              </span>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight">{entry.title}</h2>
                  <span className="inline-flex items-center rounded-full bg-[#7C3AED]/10 px-2.5 py-0.5 text-xs font-semibold text-brand-foreground">
                    {entry.version}
                  </span>
                </div>
                {/* Date (Mobile) */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground sm:hidden">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(entry.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                </div>
              </div>

              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                {entry.description}
              </p>

              {entry.notice && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium leading-relaxed">{entry.notice}</p>
                </div>
              )}

              <div className="space-y-6">
                {entry.features.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                      <LocalizedText id="e_ARYQ91-kY6" />
                    </h3>
                    <ul className="space-y-2.5">
                      {entry.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-foreground" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {entry.fixes && entry.fixes.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                      <LocalizedText id="D7f-ur6F_CU0" />
                    </h3>
                    <ul className="space-y-2.5">
                      {entry.fixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span className="text-sm text-muted-foreground">{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
