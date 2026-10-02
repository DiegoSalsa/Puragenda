/** Template-neutral preview message identity and sender boundary. */
export const PREVIEW_PROTOCOL = "puragenda.website.v2";
export function trustedPreviewSender(event: Pick<MessageEvent, "origin" | "source">, parent: MessageEventSource, origin: string) {
  return event.origin === origin && event.source === parent;
}
