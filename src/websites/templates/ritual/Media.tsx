"use client";
import Image from "next/image";
import type { ComponentProps } from "react";
export default function Media(props: ComponentProps<typeof Image>) { if (!props.src) return null; return <Image {...props} alt={props.alt} unoptimized={typeof props.src === "string" && /^(https:|blob:)/.test(props.src)} />; }
