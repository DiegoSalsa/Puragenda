import Image from "next/image";
import type { ComponentProps } from "react";
export default function Media(props: ComponentProps<typeof Image>) {
  if (!props.src) return <span role="img" aria-label={props.alt || "Imagen pendiente"} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#e7e8e8", color: "#59595b", fontSize: 14, padding: 20 }}>Imagen pendiente</span>;
  return <Image {...props} alt={props.alt} unoptimized={typeof props.src === "string" && /^(https:|blob:)/.test(props.src)} />;
}
