"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Unlink,
} from "@/components/icons/hover-icons";
import { useRouter } from "next/navigation";

type ConnectionSummary = {
  id: string;
  googleEmail: string;
  calendarId: string;
  calendarName: string | null;
  includeCustomerAttendee: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export function GoogleCalendarCard({
  title,
  description,
  scope,
  staffId,
  configured,
  connection,
}: {
  title: string;
  description: string;
  scope: "business" | "staff";
  staffId?: string;
  configured: boolean;
  connection: ConnectionSummary | null;
}) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [calendars, setCalendars] = useState<Array<{
    id: string;
    name: string;
    primary: boolean;
    accessRole: "writer" | "owner";
    shared: boolean;
  }> | null>(null);
  const [calendarId, setCalendarId] = useState(connection?.calendarId ?? "primary");
  const [includeCustomer, setIncludeCustomer] = useState(
    connection?.includeCustomerAttendee ?? true,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadCalendars() {
    if (!connection) return;
    setLoading(true);
    setMessage(null);
    const response = await fetch(
      `/api/google-calendar/calendars?connectionId=${encodeURIComponent(connection.id)}`,
    );
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || legacy("voe8P6KWIA75"));
      return;
    }
    setCalendars(data.calendars);
  }

  async function saveSettings() {
    if (!connection) return;
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/google-calendar/connection", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        connectionId: connection.id,
        calendarId,
        includeCustomerAttendee: includeCustomer,
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || legacy("_dR4uovrVeJX"));
      return;
    }
    setMessage(legacy("wV_cjVtvB-g9"));
    router.refresh();
  }

  async function disconnect() {
    if (!connection || !confirm(legacy("-6k8bLE9E02k"))) return;
    setLoading(true);
    setMessage(null);
    const response = await fetch(
      `/api/google-calendar/connection?connectionId=${encodeURIComponent(connection.id)}`,
      { method: "DELETE" },
    );
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "No se pudo desconectar Google Calendar.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-[#4285F4]" />
            {title}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {connection && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" /> <LocalizedText id="dETjfqZgwkz9" />
          </span>
        )}
      </div>

      {!configured ? (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500">
          <LocalizedText id="HWqFeWSvmfpN" />
        </div>
      ) : !connection ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4285F4]" />
              <div>
                <p className="font-medium"><LocalizedText id="-nimjZM1Y_lP" /></p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  <li><LocalizedText id="bPi6aSjsZfo_" /></li>
                  <li><LocalizedText id="Rsr9jgQvQEQF" /></li>
                  <li><LocalizedText id="1LuQyJLs0jKk" /></li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  <LocalizedText id="TLjRA8IFI5CO" />
                </p>
              </div>
            </div>
          </div>
          <a
            href={`/api/google-calendar/authorize?scope=${scope}${staffId ? `&staffId=${encodeURIComponent(staffId)}` : ""}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4285F4] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#3367D6]"
          >
            <CalendarDays className="h-4 w-4" /> <LocalizedText id="7QPl1UQpaUxa" />
          </a>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">{connection.googleEmail}</p>
            <p className="mt-1 text-muted-foreground">
              <LocalizedText id="PZ9ZGpLl-Gcb" /> {connection.calendarName || connection.calendarId}
            </p>
            {connection.lastSyncedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                <LocalizedText id="Z_NXGo2rZowr" /> {new Date(connection.lastSyncedAt).toLocaleString("es-CL")}
              </p>
            )}
          </div>

          {connection.lastSyncError && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
              {connection.lastSyncError}
            </p>
          )}

          {calendars ? (
            <label className="block space-y-1.5 text-sm font-medium">
              <LocalizedText id="0re7vkJIhC9v" />
              <select
                value={calendarId}
                onChange={(event) => setCalendarId(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                    {calendar.primary ? " (principal)" : calendar.shared ? " (compartido)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <button
              type="button"
              onClick={loadCalendars}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> <LocalizedText id="kYzHDot-sKiN" />
            </button>
          )}

          <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
            <input
              type="checkbox"
              checked={includeCustomer}
              onChange={(event) => setIncludeCustomer(event.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium"><LocalizedText id="Wo079sKxRUmw" /></span>
              <span className="mt-1 block text-xs text-muted-foreground">
                <LocalizedText id="NuIswY1Op847" />
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveSettings}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4285F4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} <LocalizedText id="befKJelwecEY" />
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 disabled:opacity-50"
            >
              <Unlink className="h-4 w-4" /> <LocalizedText id="iRMPd7f6Q2vG" />
            </button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      )}
    </section>
  );
}
