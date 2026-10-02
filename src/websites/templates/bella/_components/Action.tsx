"use client";
import { useRef } from "react";
import ArrowNarrowRightIcon from "../icons/arrow-narrow-right-icon";
import type { AnimatedIconHandle } from "../icons/types";
import { openBooking } from "./booking-events";
import styles from "../studio.module.css";
type Props = { children: React.ReactNode; href?: string; booking?: boolean; serviceId?: string; quiet?: boolean; className?: string };
export default function Action({ children, href = "#agenda", booking = false, serviceId, quiet = false, className = "" }: Props) {
  const icon = useRef<AnimatedIconHandle>(null);
  return <a href={href} className={`${quiet ? styles.textAction : styles.action} ${className}`} onClick={() => { if (booking) openBooking(serviceId); }} onMouseEnter={() => icon.current?.startAnimation()} onMouseLeave={() => icon.current?.stopAnimation()} onFocus={() => icon.current?.startAnimation()}>
    {children}<span aria-hidden="true"><ArrowNarrowRightIcon size={23} ref={icon} /></span>
  </a>;
}
