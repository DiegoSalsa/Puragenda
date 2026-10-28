import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { requireSameOrigin } from "@/server/security/same-origin";
import { growthSandboxEnabled } from "@/server/puri/growth/access";
import { checkPuriRateLimit } from "@/server/puri/rate-limit";
import { readContactText } from "@/server/contact-flow/http";
import { cancelOwnerMercadoPago, checkoutOwnerMercadoPago, loadOwnerMercadoPago, requireCommercialBillingOwner } from "@/server/commercial-billing/mercadopago-owner";
export const runtime = "nodejs";
const schema = z.object({ action: z.enum(["LOAD", "CHECKOUT", "CANCEL_RENEWAL", "RECONCILE_CANCELLATION"]),
  explicit: z.boolean().optional(), revision: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();
export async function POST(request: NextRequest) {
  if (!growthSandboxEnabled()) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
    const owner = await requireCommercialBillingOwner(user.id);
    const limit = await checkPuriRateLimit(`billing:${owner.businessId}:${owner.actorId}`);
    if (!limit.allowed) return Response.json({ code: "RATE_LIMIT" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const parsed = schema.safeParse(await readContactText(request, 2048).then(JSON.parse).catch(() => null));
    if (!parsed.success) return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
    const input = parsed.data;
    if (input.action !== "LOAD" && input.explicit !== true) return Response.json({ code: "EXPLICIT_CONFIRMATION_REQUIRED" }, { status: 400 });
    let result;
    if (input.action === "CHECKOUT") result = await checkoutOwnerMercadoPago(owner);
    if (input.action === "CANCEL_RENEWAL" || input.action === "RECONCILE_CANCELLATION") {
      if (!input.revision) return Response.json({ code: "REVISION_REQUIRED" }, { status: 400 });
      result = await cancelOwnerMercadoPago(owner, input.revision, input.action === "RECONCILE_CANCELLATION");
    }
    return Response.json({ ...await loadOwnerMercadoPago(owner), result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "BILLING_UNAVAILABLE";
    return Response.json({ code }, { status: code === "OWNER_REQUIRED" ? 403 : 409, headers: { "Cache-Control": "private, no-store" } });
  }
}
