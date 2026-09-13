"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { moderateReviewAction } from "@/server/actions/admin-reviews.actions";

export function AdminReviewModerationForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function run(decision: "APPROVE" | "REMOVE" | "KEEP_PRIVATE") {
    const formData = new FormData();
    formData.set("reviewId", reviewId);
    formData.set("decision", decision);
    const notes = (document.getElementById(`notes-${reviewId}`) as HTMLTextAreaElement | null)?.value;
    if (notes) formData.set("notes", notes);
    const result = await moderateReviewAction(formData);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2">
      <label className="text-xs font-black" htmlFor={`notes-${reviewId}`}>Notas internas</label>
      <textarea id={`notes-${reviewId}`} rows={2} className="w-full border-2 border-black p-2 text-sm" />
      {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="border-2 border-black bg-[#bffcc6] px-3 py-2 text-xs font-black" onClick={() => run("APPROVE")}>
          Aprobar reseña
        </button>
        <button type="button" className="border-2 border-black bg-[#ffb5e8] px-3 py-2 text-xs font-black" onClick={() => run("REMOVE")}>
          Retirar reseña
        </button>
        <button type="button" className="border-2 border-black bg-white px-3 py-2 text-xs font-black" onClick={() => run("KEEP_PRIVATE")}>
          Mantener privada
        </button>
      </div>
    </div>
  );
}
