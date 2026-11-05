import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { loadSetup, setupContext, SetupError } from "@/server/onboarding/service";
import { SetupClient } from "./setup-client";

export const dynamic = "force-dynamic";
export default async function SetupPage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  let snapshot;
  try {
    snapshot = await loadSetup(await setupContext(user));
  } catch (error) {
    if (error instanceof SetupError) return <div role="alert" className="rounded-2xl border border-border bg-card p-6"><h1 className="text-xl font-bold">Puri Setup</h1><p className="mt-3">{error.message}</p><p className="mt-2 text-sm text-muted-foreground">Pide a la persona que administra el negocio que continúe la configuración.</p></div>;
    throw error;
  }
  return <SetupClient initial={snapshot} />;
}
