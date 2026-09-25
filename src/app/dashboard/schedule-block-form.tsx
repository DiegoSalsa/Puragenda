"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Crown, Loader2 } from "@/components/icons/hover-icons";
import { LocalizedText } from "@/components/i18n/localized-text";
import { TimeTextInput } from "@/components/ui/time-text-input";
import { createScheduleBlockAction } from "@/server/actions/dashboard.actions";

export function ScheduleBlockForm({
  staffId,
  locationId,
  initialDate = "",
  onCancel,
  onCreated,
}: {
  staffId: string;
  locationId?: string;
  initialDate?: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [blockDate, setBlockDate] = useState(initialDate);
  const [blockStart, setBlockStart] = useState("13:00");
  const [blockEnd, setBlockEnd] = useState("14:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState<"UNAVAILABLE" | "PRIORITY">("UNAVAILABLE");
  const [blockReleaseHours, setBlockReleaseHours] = useState<"never" | "24" | "48" | "72">("48");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState("");

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground"><LocalizedText id="OGjShD1ZJMGS" /></label>
          <select
            value={blockType}
            onChange={(event) => setBlockType(event.target.value as "UNAVAILABLE" | "PRIORITY")}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
          >
            <option value="UNAVAILABLE">No disponible</option>
            <option value="PRIORITY">Cupo prioritario</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground"><LocalizedText id="k7Kp73gsrNZx" /></label>
          <input
            type="date"
            value={blockDate}
            onChange={(event) => setBlockDate(event.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground"><LocalizedText id="3s1C0njuIUrC" /></label>
          <input
            type="text"
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value)}
            placeholder={blockType === "PRIORITY" ? "Ej: Clientas frecuentes" : legacy("NoEJSLEpU1pJ")}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground"><LocalizedText id="JxhvvnxYbSqV" /></label>
          <TimeTextInput value={blockStart} onChange={setBlockStart} ariaLabel={legacy("kioVb9ASsX0K")} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground"><LocalizedText id="GbD4tTdvvpN_" /></label>
          <TimeTextInput value={blockEnd} onChange={setBlockEnd} ariaLabel={legacy("YZFYc3Zn3Pc5")} />
        </div>
      </div>
      {blockType === "PRIORITY" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <label className="mb-1 block text-xs font-medium text-amber-500"><LocalizedText id="muETJIMWVNf3" /></label>
          <select
            value={blockReleaseHours}
            onChange={(event) => setBlockReleaseHours(event.target.value as "never" | "24" | "48" | "72")}
            className="w-full rounded-lg border border-amber-500/20 bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="never">No liberar automáticamente</option>
            <option value="24">24 horas antes</option>
            <option value="48">48 horas antes</option>
            <option value="72">72 horas antes</option>
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            <LocalizedText id="LHyTjNNk_jPc" />
          </p>
        </div>
      )}
      {blockError && <p className="text-xs text-red-400">{blockError}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            if (!blockDate) { setBlockError(legacy("quhzeJ1PaInz")); return; }
            setSavingBlock(true);
            setBlockError("");
            const res = await createScheduleBlockAction({
              staffId,
              locationId,
              date: blockDate,
              startTime: blockStart,
              endTime: blockEnd,
              reason: blockReason || undefined,
              type: blockType,
              releaseHoursBefore: blockType === "PRIORITY" && blockReleaseHours !== "never"
                ? Number(blockReleaseHours)
                : null,
            });
            if (res.error) {
              setBlockError(res.error);
            } else {
              onCreated();
              router.refresh();
            }
            setSavingBlock(false);
          }}
          disabled={savingBlock}
          className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {savingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : blockType === "PRIORITY" ? <Crown className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          {blockType === "PRIORITY" ? "Crear cupo prioritario" : "Crear bloqueo"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"><LocalizedText id="u527QG3L1SSL" /></button>
      </div>
    </div>
  );
}
