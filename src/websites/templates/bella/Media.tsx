import NextImage from "next/image";
import type { ComponentProps } from "react";
export default function Media(props: ComponentProps<typeof NextImage>) {
  if (!props.src) return <span role="img" aria-label={props.alt || "Imagen pendiente"} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#e7e8e8", color: "#59595b", fontSize: 14 }}>Imagen pendiente</span>;
  return <NextImage {...props} unoptimized={typeof props.src === "string" && props.src.startsWith("https:")} />;
}
