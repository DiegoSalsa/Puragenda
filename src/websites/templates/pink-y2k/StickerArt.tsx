import { stickerArt, type PinkSticker } from "./stickers";

export default function StickerArt({ sticker }: { sticker: Pick<PinkSticker, "kind" | "image"> }) {
  const src = sticker.kind === "custom" ? sticker.image : stickerArt(sticker.kind)?.src;
  if (!src) return null;
  // Native images preserve the alpha and proportions of the customer-supplied cutouts.
  // Custom images still pass the tenant's media ownership validation.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} loading="lazy" decoding="async" />;
}
