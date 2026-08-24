"use client";

import { useTransition } from "react";
import { UserCheck } from "@/components/icons/hover-icons";
import { impersonateBusinessAction } from "@/server/actions/impersonate.actions";
import { LocalizedText } from "@/components/i18n/localized-text";

export function ImpersonateButton({ businessId }: { businessId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleImpersonate = () => {
    if (window.confirm("¿Seguro que deseas suplantar la identidad de este negocio? Entrarás a su dashboard como si fueras el propietario.")) {
      startTransition(async () => {
        const res = await impersonateBusinessAction(businessId);
        if (res?.error) {
          alert(res.error);
        }
      });
    }
  };

  return (
    <button
      onClick={handleImpersonate}
      disabled={isPending}
      className="flex items-center gap-2 border-2 border-black bg-[#FFB5E8] px-3 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
    >
      <UserCheck className="h-4 w-4" />
      {isPending ? "Suplantando..." : "Suplantar Identidad"}
    </button>
  );
}
