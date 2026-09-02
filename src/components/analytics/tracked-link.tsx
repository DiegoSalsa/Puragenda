"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/client";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  cta: string;
  placement: string;
};

export function TrackedLink({ cta, placement, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        track("landing_cta_clicked", { cta, placement });
        onClick?.(event);
      }}
    />
  );
}

type TrackedAnchorProps = ComponentProps<"a"> & {
  placement: string;
};

type TrackedCtaAnchorProps = TrackedAnchorProps & {
  cta: string;
};

export function TrackedCtaAnchor({ cta, placement, onClick, ...props }: TrackedCtaAnchorProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        track("landing_cta_clicked", { cta, placement });
        onClick?.(event);
      }}
    />
  );
}

export function TrackedWhatsAppLink({ placement, onClick, ...props }: TrackedAnchorProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        track("whatsapp_clicked", { placement });
        onClick?.(event);
      }}
    />
  );
}
