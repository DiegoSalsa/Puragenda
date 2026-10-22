import { z } from "zod";
import { NextRequest } from "next/server";
import { getClientPortalAccountFromRequest } from "@/server/services/client-portal.service";
import { requireSameOrigin } from "@/server/security/same-origin";
import { publicConsentEnabled, portalCommercialPreferences, updatePortalCommercialPreference } from "@/server/contact-flow/public-consent";
import { readContactText, contactPublicLimiter } from "@/server/contact-flow/http";
import { COMMERCIAL_CONSENT_VERSION } from "@/core/commercial-consent";
const input = z.object({ businessId: z.string().min(1).max(100), accepted: z.boolean(), textVersion: z.literal(COMMERCIAL_CONSENT_VERSION) }).strict();
export async function GET(request: NextRequest) {
  if (!publicConsentEnabled()) return new Response(null, { status: 404 });
  try {
    const account = await getClientPortalAccountFromRequest(request);
    if (!account) return new Response(null, { status: 401 });
    return Response.json({ preferences: await portalCommercialPreferences(account) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ code: "PREFERENCE_UNAVAILABLE" }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!publicConsentEnabled()) return new Response(null, { status: 404 });
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  const limited = await contactPublicLimiter.check(request);
  if (limited) return limited;
  let account;
  try { account = await getClientPortalAccountFromRequest(request); }
  catch { return Response.json({ code: "PREFERENCE_UNAVAILABLE" }, { status: 503 }); }
  if (!account) return new Response(null, { status: 401 });
  const body = input.safeParse(await readContactText(request).then(JSON.parse).catch(() => null));
  if (!body.success) return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  try {
    await updatePortalCommercialPreference(account, body.data.businessId, body.data.accepted);
    return Response.json({ preferences: await portalCommercialPreferences(account) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ code: "PREFERENCE_UNAVAILABLE" }, { status: 403 }); }
}
