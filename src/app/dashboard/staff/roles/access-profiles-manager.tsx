"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import Link from "next/link";
import { PERMISSION_CATALOG } from "@/core/permissions";
import { deleteAccessProfileAction, saveAccessProfileAction } from "@/server/actions/access-profile.actions";

type Profile = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  baseRole: string | null;
  isSystem: boolean;
  accountCount: number;
};

const TEMPLATES = [
  {
    name: "Profesional",
    description: "Ve sus citas y sus análisis personales.",
    permissions: ["appointments.view_own", "appointments.manage_own", "analytics.view_own"],
  },
  {
    name: "Recepción",
    description: "Gestiona agenda, clientes, servicios y suscripciones.",
    permissions: ["appointments.view_all", "appointments.manage_all", "analytics.view_business", "services.manage", "clients.manage", "recurring.manage"],
  },
  {
    name: "Encargado de marca",
    description: "Puede mantener servicios, imágenes, temas y widget.",
    permissions: ["appointments.view_own", "appointments.manage_own", "analytics.view_own", "services.manage", "appearance.manage"],
  },
];

export function AccessProfilesManager({ profiles }: { profiles: Profile[] }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof PERMISSION_CATALOG>();
    for (const permission of PERMISSION_CATALOG) {
      groups.set(permission.group, [...(groups.get(permission.group) || []), permission]);
    }
    return [...groups.entries()];
  }, []);

  function openNew(template?: typeof TEMPLATES[number]) {
    setEditing(null);
    setName(template?.name || "");
    setDescription(template?.description || "");
    setPermissions(template?.permissions || ["appointments.view_own", "appointments.manage_own", "analytics.view_own"]);
    setError("");
    setFormOpen(true);
  }

  function openEdit(profile: Profile) {
    setEditing(profile);
    setName(profile.name);
    setDescription(profile.description);
    setPermissions(profile.permissions);
    setError("");
    setFormOpen(true);
  }

  function togglePermission(code: string) {
    setPermissions((current) => current.includes(code) ? current.filter((permission) => permission !== code) : [...current, code]);
  }

  async function save() {
    setSaving(true);
    setError("");
    const result = await saveAccessProfileAction({
      id: editing?.id,
      name,
      description,
      permissions,
      baseRole: permissions.includes("appointments.view_all") ? "RECEPTIONIST" : "STAFF",
    });
    setSaving(false);
    if ("success" in result && result.success) {
      setFormOpen(false);
      router.refresh();
    } else setError(result.error || legacy("ixRT8OWjCyNK"));
  }

  async function remove(profileId: string) {
    setDeleting(profileId);
    setError("");
    const result = await deleteAccessProfileAction(profileId);
    setDeleting(null);
    if ("success" in result && result.success) router.refresh();
    else setError(result.error || legacy("LDOAL_dtx4ee"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-tour="page-header">
        <div>
          <Link href="/dashboard/staff" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> <LocalizedText id="fV-b-49rx1Zb" /></Link>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight"><ShieldCheck className="h-7 w-7 text-[#7C3AED]" /> <LocalizedText id="ZbvRWWfJzdSu" /></h1>
          <p className="mt-1 text-sm text-muted-foreground"><LocalizedText id="kxPs0H5trOHo" /></p>
        </div>
        <button onClick={() => openNew()} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-5 text-sm font-bold text-white hover:bg-[#6D28D9]"><Plus className="h-4 w-4" /> <LocalizedText id="f4NNCnsZjLN8" /></button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold"><LocalizedText id="YWuV-iOJntte" /></h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {TEMPLATES.map((template) => (
            <button key={template.name} onClick={() => openNew(template)} className="rounded-2xl border border-border p-4 text-left transition-all hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5">
              <p className="font-bold">{template.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
              <span className="mt-3 inline-flex rounded-full bg-[#7C3AED]/10 px-2.5 py-1 text-[11px] font-bold text-[#7C3AED]">{template.permissions.length} <LocalizedText id="wGkQB_6TEiGy" /></span>
            </button>
          ))}
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-tour="profiles-grid">
        {profiles.map((profile) => (
          <article key={profile.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{profile.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{profile.description || legacy("nj1IL6yQ0YTr")}</p>
              </div>
              <span className="shrink-0 rounded-full bg-black px-2.5 py-1 text-[10px] font-bold text-white dark:bg-white dark:text-black">{profile.accountCount} <LocalizedText id="UrP_VVytf1B3" /></span>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.permissions.slice(0, 5).map((code) => {
                const permission = PERMISSION_CATALOG.find((item) => item.code === code);
                return <span key={code} className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">{permission?.label || code}</span>;
              })}
              {profile.permissions.length > 5 && <span className="rounded-full bg-muted px-2 py-1 text-[10px]">+{profile.permissions.length - 5}</span>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => openEdit(profile)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-bold hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> <LocalizedText id="LrqUay4e5LYq" /></button>
              <button disabled={deleting === profile.id || profile.accountCount > 0} onClick={() => remove(profile.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40" title={profile.accountCount ? legacy("bVT0_I0JYODf") : legacy("zM9k6dfico7L")}>{deleting === profile.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} <LocalizedText id="yYlM8AL5C9C-" /></button>
            </div>
          </article>
        ))}
        {profiles.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3"><LocalizedText id="A5RlWjFN4SZS" /></div>}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setFormOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-bold">{editing ? "Editar rol" : "Nuevo rol"}</h2><p className="mt-1 text-sm text-muted-foreground"><LocalizedText id="i_-QTFFgcGGM" /></p></div>
              <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-sm font-medium"><LocalizedText id="ViuxV1eotZPW" /></span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder={legacy("edSa9zcTRsho")} className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm" /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium"><LocalizedText id="7gC5b_8mb-JW" /></span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={280} placeholder={legacy("vfYZmfn8TlMR")} className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm" /></label>
            </div>
            <div className="mt-6 space-y-5">
              {grouped.map(([group, items]) => (
                <fieldset key={group}>
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((permission) => {
                      const checked = permissions.includes(permission.code);
                      return (
                        <label key={permission.code} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${checked ? "border-[#7C3AED]/50 bg-[#7C3AED]/5" : "border-border"}`}>
                          <button type="button" role="checkbox" aria-checked={checked} onClick={() => togglePermission(permission.code)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border"}`}>{checked && <Check className="h-3.5 w-3.5" />}</button>
                          <span><span className="block text-sm font-semibold">{permission.label}{permission.critical && <b className="ml-1.5 text-[9px] uppercase text-amber-500"><LocalizedText id="TAC4RZkrBKdB" /></b>}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{permission.description}</span></span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            <button disabled={saving || name.trim().length < 2 || !permissions.length} onClick={save} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} <LocalizedText id="mxFaFxBfiwh3" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
