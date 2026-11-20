"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDashboardOverlay } from "./dashboard-overlay-context";

export function ChristmasThemeNotice({ businessId, userId, endDate, canManageSettings }: {
  businessId: string;
  userId: string;
  endDate: string;
  canManageSettings: boolean;
}) {
  const t = useTranslations("dashboard.christmas");
  const format = useFormatter();
  const { isChangelogOpen, setupPriority, activeHelp } = useDashboardOverlay();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const openingSettings = useRef(false);
  const storageKey = `puragenda:christmas-notice:${endDate}:${businessId}:${userId}`;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setDismissed(localStorage.getItem(storageKey) === "dismissed");
      } catch {
        setDismissed(false);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "dismissed");
    } catch {
      // The notice stays dismissed for the current mount if storage is unavailable.
    }
  }

  const date = format.dateTime(new Date(`${endDate}T00:00:00Z`), { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <Dialog open={dismissed === false && !isChangelogOpen && !setupPriority && !activeHelp} onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent
        className="dashboard-christmas z-[10002] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-border p-5 shadow-xl motion-reduce:animate-none sm:max-w-md sm:p-6"
        overlayClassName="z-[10001] bg-black/50 motion-reduce:animate-none"
        finalFocus={() => !openingSettings.current}
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground" aria-hidden="true">
          <Snowflake className="size-5" />
        </div>
        <DialogTitle className="text-xl font-bold">{t("noticeTitle")}</DialogTitle>
        <DialogDescription className="leading-relaxed">{t("noticeDescription", { date })}</DialogDescription>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {canManageSettings ? t.rich("noticeOptOut", {
            settings: (label) => (
              <Link
                href="/dashboard/settings#tema-navideno"
                className="font-semibold text-foreground underline underline-offset-4"
                onNavigate={() => { openingSettings.current = true; dismiss(); }}
              >
                {label}
              </Link>
            ),
          }) : t("noticeOptOutTeam")}
        </p>
        <DialogClose render={<Button className="w-full sm:w-fit sm:justify-self-end" />}>
          {t("noticeDismiss")}
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
