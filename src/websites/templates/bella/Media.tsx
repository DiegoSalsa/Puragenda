import NextImage from "next/image";
import type { ComponentProps } from "react";
export default function Media(props: ComponentProps<typeof NextImage>) {
  if (!props.src) return null;
  return <NextImage {...props} unoptimized={typeof props.src === "string" && props.src.startsWith("https:")} />;
}
