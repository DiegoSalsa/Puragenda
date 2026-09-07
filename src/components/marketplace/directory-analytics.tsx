"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

export function DirectoryAnalytics() {
  useEffect(() => {
    track("directory_view", { page_type: "directory" });
  }, []);
  return null;
}
