import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getApiAdminSessionUser } from "@/server/auth/admin-session";
import { requireSameOrigin } from "@/server/security/same-origin";
import { createPuriContext } from "@/server/puri/context";
import { createGrowthScope } from "@/server/puri/growth/access";
import { checkPuriRateLimit } from "@/server/puri/rate-limit";
import {
  campaignInput,
  contactLabEnabled,
  contactLock,
  requireContactScope,
} from "@/server/contact-flow/policy";
import {
  authorizeCampaign,
  contactSnapshot,
  controlCampaign,
  prepareCampaign,
  campaignRecipients,
} from "@/server/contact-flow/campaigns";
import { runContactWorker } from "@/server/contact-flow/worker";
import { reconcileSimulatedDeliveries, reconcileResendDeliveries } from "@/server/contact-flow/events";
import { contactProviderMode } from "./resend-test";
import { contactResults } from "@/server/contact-flow/metrics";
import { prisma } from "@/server/db/prisma";
import { readContactText } from "@/server/contact-flow/http";
import { contactOperationalStatus } from "./operations";
const schema = z
  .object({
    action: z.enum([
      "LOAD",
      "PREPARE",
      "REVISE",
      "AUTHORIZE",
      "PAUSE",
      "RESUME",
      "CANCEL",
      "RUN",
      "RECONCILE",
      "KILL",
      "GLOBAL_KILL",
      "RESULTS",
      "RECIPIENTS",
      "MONITOR",
    ]),
    locationSlug: z.string().max(100).optional(),
    id: z.string().min(1).max(100).optional(),
    hash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    version: z.number().int().positive().optional(),
    explicit: z.boolean().optional(),
    killed: z.boolean().optional(),
    campaign: campaignInput.optional(),
    after: z.string().min(1).max(100).optional(),
  })
  .strict();
export async function POST(request: NextRequest) {
  if (!contactLabEnabled())
    return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  const parsed = schema.safeParse(
    await readContactText(request)
      .then((raw) => JSON.parse(raw))
      .catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const a = parsed.data;
    if (a.action === "MONITOR") {
      const admin = await getApiAdminSessionUser(request);
      if (!admin) return Response.json({ code: "SUPERADMIN_REQUIRED" }, { status: 403 });
      return Response.json(await contactOperationalStatus(admin.id), { headers: { "Cache-Control": "private, no-store" } });
    }
    const
      user = await getApiSessionUser(request);
    if (!user)
      return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
    const context = await createPuriContext(user, {
        pathname: "/dashboard/puri-plus",
        locale: "es",
        locationSlug: a.locationSlug,
      }),
      scope = await createGrowthScope(context);
    await requireContactScope(scope);
    const limit = await checkPuriRateLimit(
      `${scope.businessId}:${scope.actorId}:contact-flow`,
    );
    if (!limit.allowed)
      return Response.json(
        { code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    let result: unknown;
    if (a.action === "PREPARE" || a.action === "REVISE") {
      if (!a.campaign || (a.action === "REVISE" && !a.id))
        throw new Error("INVALID_REQUEST");
      result = await prepareCampaign(
        scope,
        a.campaign,
        new Date(),
        a.action === "REVISE" ? a.id : undefined,
      );
    } else if (a.action === "AUTHORIZE") {
      if (!a.id || !a.hash || !a.version) throw new Error("INVALID_REQUEST");
      result = await authorizeCampaign(
        scope,
        a.id,
        a.hash,
        a.version,
        a.explicit === true,
      );
    } else if (
      a.action === "PAUSE" ||
      a.action === "RESUME" ||
      a.action === "CANCEL"
    ) {
      if (!a.id || !a.explicit)
        throw new Error("EXPLICIT_CONFIRMATION_REQUIRED");
      result = await controlCampaign(scope, a.id, a.action);
    } else if (a.action === "RUN" || a.action === "RECONCILE") {
      await requireContactScope(scope, true);
      if (!a.explicit) throw new Error("EXPLICIT_CONFIRMATION_REQUIRED");
      result =
        a.action === "RUN"
          ? await runContactWorker({ businessId: scope.businessId, limit: 5 })
          : contactProviderMode(scope.businessId) !== "SIMULATED_ONLY" ? await reconcileResendDeliveries(5, scope.businessId) : await reconcileSimulatedDeliveries(scope.businessId);
    } else if (a.action === "KILL" || a.action === "GLOBAL_KILL") {
      await requireContactScope(scope, true);
      if (a.killed === undefined || !a.explicit)
        throw new Error("EXPLICIT_CONFIRMATION_REQUIRED");
      if (
        a.action === "GLOBAL_KILL" &&
        !(await getApiAdminSessionUser(request))
      )
        return Response.json({ code: "SUPERADMIN_REQUIRED" }, { status: 403 });
      const key = a.action === "GLOBAL_KILL" ? "GLOBAL" : scope.businessId;
      result = await prisma.$transaction(async (tx) => {
        await contactLock(tx);
        const p = await tx.cfPolicy.update({
          where: { key },
          data: { killed: a.killed },
        });
        await tx.cfAudit.create({
          data: {
            businessId: scope.businessId,
            actorId: scope.actorId,
            event: a.action,
            key: `policy:${key}:${crypto.randomUUID()}`,
            details: { killed: a.killed ?? true },
          },
        });
        return { killed: p.killed };
      });
    } else if (a.action === "RESULTS") {
      if (!a.id) throw new Error("INVALID_REQUEST");
      result = await contactResults(scope, a.id);
    } else if (a.action === "RECIPIENTS") {
      if (!a.id) throw new Error("INVALID_REQUEST");
      result = await campaignRecipients(scope, a.id, a.after);
    }
    return Response.json(
      { result, ...(await contactSnapshot(scope)) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const code =
      error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "CONTACT_FLOW_UNAVAILABLE";
    return Response.json(
      { code },
      {
        status: code.includes("FORBIDDEN") ? 403 : 409,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
