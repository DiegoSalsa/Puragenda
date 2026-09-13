"use client";

import { useState } from "react";
import { ReviewForm } from "@/components/reviews/review-form";

export function PortalReviewClient({
  appointmentId,
  businessName,
  serviceName,
}: {
  appointmentId: string;
  businessName: string;
  serviceName: string;
}) {
  const [result, setResult] = useState<{ visibility: string; status: string } | null>(null);
  if (result) {
    return (
      <div className="mt-6 rounded-[2rem] border-4 border-black bg-[#bffcc6] p-6 shadow-[8px_8px_0_#000]">
        <h2 className="text-2xl font-black">¡Gracias por tu opinión!</h2>
        {result.visibility === "PUBLIC" ? (
          <p className="mt-2 text-sm font-semibold">
            Tu opinión fue enviada y aparecerá en Puragenda una vez finalizado el proceso de revisión.
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold">El negocio recibió tu comentario. No se publicará en Puragenda.</p>
        )}
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-[2rem] border-4 border-black bg-[#fffaf0] p-5 shadow-[8px_8px_0_#000]">
      <ReviewForm
        appointmentId={appointmentId}
        businessName={businessName}
        serviceName={serviceName}
        source="mi_agenda"
        authenticated
        onSubmitted={setResult}
      />
    </section>
  );
}
