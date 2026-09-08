"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "@/components/icons/hover-icons";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { resetAnalyticsIdentity } from "@/lib/analytics/client";

type AdminSessionSummary = {
  id: string;
  userAgent: string | null;
  lastUsedAt: string;
  current: boolean;
};

function formatLastUsed(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "reciente";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  if (date >= startOfToday) return "hoy";
  if (date >= startOfYesterday) return "ayer";
  return date.toLocaleDateString("es-CL");
}

export function AdminSessionControls({ sessions }: { sessions: AdminSessionSummary[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"current" | "all" | string | null>(null);

  async function logoutCurrent() {
    setLoading("current");
    try {
      await fetch("/api/auth/admin-session/logout", { method: "POST" });
      resetAnalyticsIdentity();
    } finally {
      router.push(`${ADMIN_SECRET_PATH}/login`);
      router.refresh();
    }
  }

  async function logoutAll() {
    setLoading("all");
    try {
      await fetch("/api/auth/admin-session/logout-all", { method: "POST" });
      resetAnalyticsIdentity();
    } finally {
      router.push(`${ADMIN_SECRET_PATH}/login`);
      router.refresh();
    }
  }

  async function revokeSession(sessionId: string) {
    setLoading(sessionId);
    try {
      await fetch(`/api/auth/admin-session?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <details className="border-2 border-black bg-white p-2">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-black/70">
          Sesiones activas
        </summary>
        <ul className="mt-2 space-y-2">
          {sessions.length === 0 ? (
            <li className="text-[11px] font-bold text-black/50">No hay otras sesiones registradas.</li>
          ) : (
            sessions.map((session) => (
              <li key={session.id} className="flex items-start justify-between gap-2 border border-black/20 p-2">
                <div>
                  <p className="text-[11px] font-black text-black">
                    {session.userAgent || "Este dispositivo"}
                    {session.current ? " · actual" : ""}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black/50">
                    Último uso {formatLastUsed(session.lastUsedAt)}
                  </p>
                </div>
                {!session.current && (
                  <button
                    type="button"
                    onClick={() => revokeSession(session.id)}
                    disabled={loading !== null}
                    className="text-[10px] font-black uppercase text-black/60 hover:text-black disabled:opacity-50"
                  >
                    {loading === session.id ? "..." : "Cerrar"}
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </details>

      <button
        type="button"
        onClick={logoutCurrent}
        disabled={loading !== null}
        className="flex w-full items-center justify-start gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-50"
      >
        {loading === "current" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Cerrar esta sesión
      </button>
      <button
        type="button"
        onClick={logoutAll}
        disabled={loading !== null}
        className="flex w-full items-center justify-start gap-2 border-2 border-black bg-[#FFB5E8] px-3 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-50"
      >
        {loading === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Cerrar todas
      </button>
    </div>
  );
}
