import { NextRequest } from "next/server";
import { contactLabEnabled } from "@/server/contact-flow/policy";
import { contactReceiptsEnabled } from "@/server/contact-flow/resend-test";
import {
  contactWebhookLimiter,
  readContactText,
} from "@/server/contact-flow/http";
import {
  receiveResendEvent,
  receiveSimulatedEvent,
} from "@/server/contact-flow/events";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (provider === "resend" ? !contactReceiptsEnabled() : !contactLabEnabled())
    return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const limited = await contactWebhookLimiter.check(request);
  if (limited) return limited;
  if (!["simulated", "resend"].includes(provider))
    return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  if (Number(request.headers.get("content-length") ?? 0) > 16384)
    return Response.json({ code: "INVALID_REQUEST" }, { status: 413 });
  try {
    const raw = await readContactText(request);
    const result =
      provider === "simulated"
        ? await receiveSimulatedEvent(
            raw,
            request.headers.get("x-cf-timestamp") ?? "",
            request.headers.get("x-cf-signature") ?? "",
          )
        : await receiveResendEvent(raw, request.headers);
    return Response.json(result);
  } catch {
    return Response.json({ code: "WEBHOOK_REJECTED" }, { status: 400 });
  }
}
