import { distributedRateLimit } from "@/server/lib/distributed-rate-limit";
export const contactPublicLimiter = distributedRateLimit({
  namespace: "contact-flow-public-lab",
  windowMs: 60000,
  max: 120,
  message: "Demasiadas solicitudes. Intenta nuevamente en un momento.",
});
export const contactWebhookLimiter = distributedRateLimit({
  namespace: "contact-flow-webhook-lab",
  windowMs: 60000,
  max: 300,
  message: "Webhook temporalmente limitado.",
});
export async function readContactText(request: Request, maximum = 16384) {
  if (Number(request.headers.get("content-length") ?? 0) > maximum)
    throw new Error("REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let length = 0,
    text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new Error("REQUEST_TOO_LARGE");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
