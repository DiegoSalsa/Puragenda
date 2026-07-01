import { prisma } from "@/server/db/prisma";
import { ResponseForm } from "./response-form";

export const dynamic = "force-dynamic";

type Field = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
};

function parseFields(fields: unknown): Field[] {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((field): field is Field => {
      if (!field || typeof field !== "object") return false;
      const candidate = field as Record<string, unknown>;
      return typeof candidate.id === "string" && typeof candidate.label === "string";
    })
    .map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type || "textarea",
      required: field.required ?? true,
    }));
}

export default async function RespondPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ thanks?: string; error?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);

  const recipient = await prisma.adminInteractiveRecipient.findUnique({
    where: { token },
    include: { campaign: true },
  });

  if (!recipient) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold">Enlace no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">No encontramos este formulario o el enlace no es valido.</p>
        </div>
      </div>
    );
  }

  return (
    <ResponseForm
      token={token}
      question={recipient.campaign.question}
      fields={parseFields(recipient.campaign.fields)}
      initialThanks={query.thanks === "1"}
    />
  );
}
