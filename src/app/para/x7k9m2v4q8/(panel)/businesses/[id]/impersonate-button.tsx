"use client";

import { useTransition } from "react";
import { UserCheck } from "@/components/icons/hover-icons";
import { impersonateBusinessAction, impersonateStaffAction } from "@/server/actions/impersonate.actions";

export function ImpersonateButton({ businessId, staffId, name }: { businessId: string; staffId?: string; name?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleImpersonate = () => {
    if (window.confirm(staffId ? `Entrarás como ${name || "este profesional"}, con los permisos de su cuenta. ¿Continuar?` : "Entrarás como propietario de este negocio. ¿Continuar?")) {
      startTransition(async () => {
        try {
          const res = staffId ? await impersonateStaffAction(businessId, staffId) : await impersonateBusinessAction(businessId);
          if (res?.error) alert(res.error);
        } catch (error) {
          // Next navigation errors must propagate so the successful action can redirect.
          if (error instanceof Error && "digest" in error) throw error;
          alert("No se pudo iniciar la suplantación. Inténtalo nuevamente.");
        }
      });
    }
  };

  return (
    <button
      aria-label={staffId ? `Entrar como ${name || "profesional"}` : "Entrar como propietario"}
      onClick={handleImpersonate}
      disabled={isPending}
      className="flex items-center gap-2 border-2 border-black bg-[#FFB5E8] px-3 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
    >
      <UserCheck className="h-4 w-4" />
      {isPending ? "Entrando..." : staffId ? "Entrar como profesional" : "Entrar como propietario"}
    </button>
  );
}
