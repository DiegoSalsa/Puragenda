"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { loadSetup, mutateSetup, setupContext } from "@/server/onboarding/service";

export async function dismissSetupCard() {
  const user = await getCurrentSessionUser();
  if (!user) return;
  const context = await setupContext(user);
  const snapshot = await loadSetup(context);
  await mutateSetup(context, { key: randomUUID(), revision: snapshot.revision, command: { type: "dismiss" } });
  revalidatePath("/dashboard");
}
