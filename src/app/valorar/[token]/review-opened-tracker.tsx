"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

export function ReviewOpenedTracker({ authenticated }: { authenticated: boolean }) {
  useEffect(() => {
    track("review_opened", { source: "review_invite", authenticated });
  }, [authenticated]);
  return null;
}
