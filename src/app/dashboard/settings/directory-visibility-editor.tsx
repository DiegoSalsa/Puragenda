"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye } from "@/components/icons/hover-icons";
import { updateMarketplaceDirectoryVisibilityAction } from "@/server/actions/dashboard.actions";

export function DirectoryVisibilityEditor({
  hasListing,
  authorized,
  revoked,
  categoryLabel,
  localityLabel,
}: {
  hasListing: boolean;
  authorized: boolean;
  revoked: boolean;
  categoryLabel: string | null;
  localityLabel: string | null;
}) {
  const t = useTranslations("dashboard.marketplaceVisibility");
  const router = useRouter();
  const [checked, setChecked] = useState(authorized);
  const [savedAuthorized, setSavedAuthorized] = useState(authorized);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasListing) {
    return (
      <div className="space-y-2">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4 text-brand-foreground" /> {t("title")}
        </div>
        <p className="text-sm text-muted-foreground">{t("missing")}</p>
      </div>
    );
  }

  function save() {
    startTransition(async () => {
      const result = await updateMarketplaceDirectoryVisibilityAction(checked);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setSavedAuthorized(checked);
      setMessage(t("saved"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="h-4 w-4 text-brand-foreground" /> {t("title")}
      </div>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {(categoryLabel || localityLabel) && (
        <p className="text-sm text-muted-foreground">
          {t("classification")}: {[categoryLabel, localityLabel].filter(Boolean).join(" · ")}
        </p>
      )}
      {revoked && !checked ? (
        <p className="text-sm text-amber-400">{t("revoked")}</p>
      ) : authorized ? (
        <p className="text-sm text-muted-foreground">{t("authorized")}</p>
      ) : null}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border bg-muted text-[#7C3AED] focus:ring-[#7C3AED]"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">{t("authorize")}</span>
          <span className="block text-sm text-muted-foreground">{t("details")}</span>
          <span className="block text-xs text-muted-foreground">{t("disclaimer")}</span>
        </span>
      </label>
      <button
        type="button"
        onClick={save}
        disabled={pending || checked === savedAuthorized}
        className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
      >
        {pending ? t("saving") : t("save")}
      </button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
