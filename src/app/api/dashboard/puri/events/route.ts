import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { createPuriContext } from "@/server/puri/context";
import { prisma } from "@/server/db/prisma";
import { requireSameOrigin } from "@/server/security/same-origin";
import { PuriAccessError } from "@/server/puri/types";

const schema = z.object({ event: z.enum(["impression", "opened", "action_clicked"]), sessionId: z.string().uuid(), locationSlug: z.string().max(100).optional(), actionId: z.enum(["agenda", "clients", "analytics", "loyalty", "recurring", "stories", "giftCards"]).optional() }).strict();

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const context = await createPuriContext(user, { pathname: "/dashboard", locationSlug: parsed.data.locationSlug, locale: "es" });
    await prisma.puriUiEvent.create({ data: {
      event: parsed.data.event, sessionId: parsed.data.sessionId, businessId: context.business.id,
      businessLocationId: context.location?.id, userId: user.id, role: user.role, actionId: parsed.data.event === "action_clicked" ? parsed.data.actionId : null,
    } });
    return Response.json({ ok: true }, { status: 202 });
  } catch (error) {
    if (error instanceof PuriAccessError) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
    return Response.json({ code: "UNAVAILABLE" }, { status: 503 });
  }
}
