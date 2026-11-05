import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { changeCommercialTrial, commercialSelectionSchema } from "@/server/services/commercial-trial.service";
import { z } from "zod";
import { requireSameOrigin } from "@/server/security/same-origin";

const schema = commercialSelectionSchema.extend({ idempotencyKey: z.string().min(1).max(100) }).strict();
export async function POST(request: NextRequest) {
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business || business.ownerId !== user.id) return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_SELECTION" }, { status: 400 });
  try {
    return NextResponse.json(await changeCommercialTrial({ ...parsed.data, businessId: business.id, actorId: user.id }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "TRIAL_CHANGE_FAILED";
    if (["IDEMPOTENCY_CONFLICT", "ACTIVE_TRIAL_REQUIRED", "ACTIVE_PROFESSIONALS_EXCEED_SELECTION"].includes(code)) return NextResponse.json({ error: code }, { status: 409 });
    return NextResponse.json({ error: "TRIAL_CHANGE_FAILED" }, { status: 500 });
  }
}
