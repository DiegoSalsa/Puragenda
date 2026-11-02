import { allowedTutorials, recommendTutorial, tutorialHref } from "@/core/tutorials";
import { canManageSetup } from "@/core/onboarding";
import { loadSetup, setupContext } from "@/server/onboarding/service";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import type { PuriAnswer, PuriContext } from "./types";

/** Deterministic help uses the same authorized catalog as the manual help button. */
export async function answerLearningQuestion(context: PuriContext, message: string): Promise<PuriAnswer | null> {
  const permissions = context.permissions ?? [];
  const candidate = recommendTutorial(message, allowedTutorials(permissions, ["website.editor"]));
  if (candidate) {
    if (candidate.capability && !(await getCommercialPlanAccess(context.business.id)).has(candidate.capability)) return null;
    return { message: `Te puedo mostrar cómo hacerlo. La guía «${candidate.title}» abre la página correspondiente y te acompaña sobre sus controles. Tú decides qué cambios guardar.`, cards: [], actions: [], toolsUsed: ["recommendTutorial"], guides: [{ id: candidate.id, title: `Iniciar guía: ${candidate.title}`, href: tutorialHref(candidate.id) }] };
  }
  if (canManageSetup(permissions) && /(?:que falta|lista mi agenda|estado.*configur|continuar.*configur|no hay disponibilidad|enlace.*reserva)/i.test(message)) {
    const snapshot = await loadSetup(await setupContext(context.user));
    const missing = [!snapshot.facts.hours && "revisar horarios", !snapshot.facts.staff && "configurar disponibilidad profesional", !snapshot.facts.services && "crear un servicio activo", !snapshot.verified && "comprobar horarios disponibles"].filter(Boolean);
    return { message: missing.length ? `Para revisar tu agenda, falta ${missing.join(", ")}. Abre Puri Setup: allí puedo comprobar la disponibilidad real y mostrarte qué corregir.` : "Tu agenda tiene disponibilidad comprobada. Puedes revisar y copiar tu enlace público desde Puri Setup.", cards: [], actions: [], toolsUsed: ["getSetupState"], guides: [{ id: "setup", title: "Continuar con Puri Setup", href: "/dashboard/setup" }] };
  }
  return null;
}
