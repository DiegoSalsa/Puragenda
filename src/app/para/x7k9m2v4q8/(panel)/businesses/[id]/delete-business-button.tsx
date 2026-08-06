"use client";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteBusinessAction } from "@/server/actions/admin.actions";

export function DeleteBusinessButton({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const result = await deleteBusinessAction(businessId);
      if (result.error) {
        alert(result.error);
      } else {
        router.push("/para/x7k9m2v4q8/businesses");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-black"><LocalizedText id="dg2WayaQKqeH" />{businessName}<LocalizedText id="10Toq4c0ZRZm" /></span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-1 border-2 border-black bg-[#FFB5E8] px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          <LocalizedText id="A6fRXflPLN6t" />
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
        >
          <LocalizedText id="u527QG3L1SSL" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 border-2 border-black bg-[#FFB5E8] px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
    >
      <Trash2 className="h-3 w-3" />
      <LocalizedText id="yYlM8AL5C9C-" />
    </button>
  );
}
