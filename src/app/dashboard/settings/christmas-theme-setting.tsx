"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Snowflake } from "lucide-react";
import { setBusinessChristmasTheme } from "@/server/actions/dashboard-appearance.actions";

export function ChristmasThemeSetting({ enabled }: { enabled: boolean }) {
  const t = useTranslations("dashboard.christmas");
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function toggle() {
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await setBusinessChristmasTheme(!enabled);
        if (!result.ok) setFailed(true);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <section
      id="tema-navideno"
      tabIndex={-1}
      aria-labelledby="christmas-setting-title"
      className="scroll-mt-4 rounded-2xl border border-border bg-card p-4 focus:outline-none sm:p-6"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-brand-foreground sm:flex">
          <Snowflake className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="christmas-setting-title" className="text-sm font-bold">{t("title")}</h2>
          <p id="christmas-setting-description" className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="christmas-setting-title"
          aria-describedby="christmas-setting-description"
          disabled={pending}
          onClick={toggle}
          className="group flex min-h-11 shrink-0 items-center gap-2 rounded-md px-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        >
          <span aria-hidden="true" className="hidden text-xs font-semibold text-muted-foreground sm:inline">{t(enabled ? "on" : "off")}</span>
          <span aria-hidden="true" className={`relative flex h-6 w-11 items-center rounded-full border border-border motion-safe:transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute left-0.5 size-4 rounded-full border border-black/20 bg-white shadow-sm motion-safe:transition-transform ${enabled ? "translate-x-5" : ""}`} />
          </span>
        </button>
      </div>
      {failed && <p role="alert" className="mt-2 text-sm text-destructive">{t("error")}</p>}
    </section>
  );
}
