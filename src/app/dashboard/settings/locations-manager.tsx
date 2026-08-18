"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { Building2, Loader2, MapPin, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getTimezoneOptions } from "@/core/countries";
import { createBusinessLocationAction, deleteBusinessLocationAction, setLocationServiceAvailabilityAction, updateBusinessLocationRecordAction } from "@/server/actions/dashboard.actions";

type Location = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  mapsUrl: string | null;
  timezone: string;
  isPrimary: boolean;
  isActive: boolean;
  serviceIds: string[];
};

const empty = { name: "", address: "", mapsUrl: "", timezone: "America/Santiago" };

function TimezoneSelector({ value, countryCode, onValueChange }: { value: string; countryCode: string; onValueChange: (value: string) => void }) {
  const options = getTimezoneOptions(countryCode);
  return <select value={value} onChange={(event) => onValueChange(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
    <optgroup label="Zonas recomendadas para el país">
      {options.filter((option) => option.preferred).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </optgroup>
    <optgroup label="Otras zonas horarias">
      {options.filter((option) => !option.preferred).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </optgroup>
  </select>;
}

export function LocationsManager({ locations, defaultTimezone, countryCode, services }: { locations: Location[]; defaultTimezone: string; countryCode: string; services: { id: string; name: string }[] }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...empty, timezone: defaultTimezone });
  const [editing, setEditing] = useState<Location | null>(null);
  const [editDraft, setEditDraft] = useState({ ...empty, timezone: defaultTimezone });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function create() {
    setBusy("new"); setMessage("");
    const result = await createBusinessLocationAction(draft);
    setBusy(null);
    if (result.error) return setMessage(result.error);
    setDraft({ ...empty, timezone: defaultTimezone }); setCreating(false); router.refresh();
  }

  async function toggle(location: Location) {
    setBusy(location.id); setMessage("");
    const result = await updateBusinessLocationRecordAction(location.id, {
      name: location.name,
      address: location.address || "Dirección pendiente",
      mapsUrl: location.mapsUrl || "",
      timezone: location.timezone,
      isActive: !location.isActive,
    });
    setBusy(null);
    if (result.error) return setMessage(result.error);
    router.refresh();
  }

  async function toggleService(locationId: string, serviceId: string, isAvailable: boolean) {
    setBusy(`${locationId}:${serviceId}`); setMessage("");
    const result = await setLocationServiceAvailabilityAction(locationId, serviceId, isAvailable);
    setBusy(null);
    if (result.error) return setMessage(result.error);
    router.refresh();
  }

  function openEdit(location: Location) {
    setEditing(location);
    setEditDraft({ name: location.name, address: location.address || "", mapsUrl: location.mapsUrl || "", timezone: location.timezone });
    setMessage("");
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(`edit:${editing.id}`); setMessage("");
    const result = await updateBusinessLocationRecordAction(editing.id, { ...editDraft, isActive: editing.isActive });
    setBusy(null);
    if (result.error) return setMessage(result.error);
    setEditing(null); router.refresh();
  }

  async function remove(location: Location) {
    if (!window.confirm(`¿Eliminar definitivamente la sucursal “${location.name}”? Esta acción solo está disponible si no tiene historial ni citas.`)) return;
    setBusy(`delete:${location.id}`); setMessage("");
    const result = await deleteBusinessLocationAction(location.id);
    setBusy(null);
    if (result.error) return setMessage(result.error);
    router.refresh();
  }

  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground"><LocalizedText id="Z-HicVFLgffc" /></p>
    <div className="space-y-2">
      {locations.map((location) => <div key={location.id} className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-brand-foreground" /><p className="min-w-0 break-words font-semibold">{location.name}</p>{location.isPrimary && <span className="shrink-0 rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-bold text-brand-foreground"><LocalizedText id="Qh2uO8AkshAG" /></span>}</div>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{location.address || legacy("3-1kEVUxJ_jM")} · {location.timezone}</span></p>
            {services.length > 0 && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs">
              {services.map((service) => {
                const available = location.serviceIds.includes(service.id);
                const key = `${location.id}:${service.id}`;
                return <label key={service.id} className="flex min-w-0 cursor-pointer items-start gap-1.5 text-muted-foreground">
                  <input type="checkbox" checked={available} disabled={busy === key} onChange={(event) => toggleService(location.id, service.id, event.target.checked)} />
                  <span className="min-w-0 break-words">{service.name}</span>
                </label>;
              })}
            </div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy === `edit:${location.id}`} onClick={() => openEdit(location)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /><LocalizedText id="LrqUay4e5LYq" /></button>
            <button type="button" disabled={location.isPrimary || busy === location.id} onClick={() => toggle(location)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">{busy === location.id ? <Loader2 className="h-4 w-4 animate-spin" /> : location.isActive ? "Archivar" : "Activar"}</button>
            <button type="button" disabled={location.isPrimary || busy === `delete:${location.id}`} onClick={() => remove(location)} className="flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" /><LocalizedText id="yYlM8AL5C9C-" /></button>
          </div>
        </div>
        {editing?.id === location.id && <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
          <input value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} placeholder={legacy("-0OwfpWKPsw3")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={editDraft.address} onChange={(event) => setEditDraft({ ...editDraft, address: event.target.value })} placeholder={legacy("KvZstl2oQGco")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={editDraft.mapsUrl} onChange={(event) => setEditDraft({ ...editDraft, mapsUrl: event.target.value })} placeholder={legacy("BdtMTqcfv3at")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <TimezoneSelector value={editDraft.timezone} countryCode={countryCode} onValueChange={(timezone) => setEditDraft({ ...editDraft, timezone })} />
          <div className="flex gap-2 md:col-span-2"><button type="button" onClick={saveEdit} disabled={busy === `edit:${location.id}`} className="flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === `edit:${location.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}<LocalizedText id="FL368vrOOgfe" /></button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-sm"><LocalizedText id="u527QG3L1SSL" /></button></div>
        </div>}
      </div>)}
    </div>
    {creating ? <div className="grid gap-3 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-4 md:grid-cols-2">
      <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={legacy("-0OwfpWKPsw3")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder={legacy("KvZstl2oQGco")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <input value={draft.mapsUrl} onChange={(event) => setDraft({ ...draft, mapsUrl: event.target.value })} placeholder={legacy("BdtMTqcfv3at")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <TimezoneSelector value={draft.timezone} countryCode={countryCode} onValueChange={(timezone) => setDraft({ ...draft, timezone })} />
      <div className="flex gap-2 md:col-span-2"><button type="button" onClick={create} disabled={busy === "new"} className="flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}<LocalizedText id="4BdQ8_Yj2lGW" /></button><button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-border px-4 py-2 text-sm"><LocalizedText id="u527QG3L1SSL" /></button></div>
    </div> : <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-2.5 text-sm font-semibold text-brand-foreground"><Plus className="h-4 w-4" /><LocalizedText id="Pz5ZBZo4TD0l" /></button>}
    {message && <p className="text-sm text-red-500">{message}</p>}
  </div>;
}
