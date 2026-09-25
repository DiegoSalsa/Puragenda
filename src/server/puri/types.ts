import type { DashboardPermission } from "@/core/permissions";

export type PuriContext = {
  user: { id: string; role: string };
  business: {
    id: string;
    ownerId: string | null;
    name: string;
    slug: string;
    timezone: string;
    currencyCode: string;
    allowSameDayBookings: boolean;
    depositRequired: boolean;
    mpAccessToken: string | null;
    mpUserId: string | null;
  };
  permissions: DashboardPermission[];
  staffId: string | null;
  canSeeAllAgendas: boolean;
  ownAgenda: boolean;
  location: { id: string; slug: string; name: string; timezone: string; isPrimary: boolean } | null;
  locationCount: number;
  locale: string;
  pathname: string;
  selectedPeriod: "week" | "month";
};

export type PuriCard =
  | { type: "metric"; label: string; value: number; unit?: "money" | "count"; currencyCode?: string; detail?: string }
  | { type: "appointment"; label: string; value: string; detail?: string }
  | { type: "client"; label: string; value: string; detail?: string }
  | { type: "availability"; label: string; value: string; detail?: string }
  | { type: "comparison"; label: string; value: string; detail?: string }
  | { type: "alert"; label: string; value: string; detail?: string };

export type PuriAction = {
  id: "agenda" | "clients" | "analytics" | "loyalty" | "recurring" | "stories" | "giftCards";
  href: string;
};

export type PuriAnswer = {
  message: string;
  cards: PuriCard[];
  actions: PuriAction[];
  toolsUsed: string[];
};

export type PuriHistoryItem = { role: "user" | "assistant"; content: string };

export class PuriAccessError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
