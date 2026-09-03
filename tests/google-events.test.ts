import { describe, expect, it } from "vitest";
import { googleAnalyticsEventsFor } from "@/lib/analytics/google-events";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";
import { sanitizeTrackingProperties } from "@/lib/analytics/events";

describe("googleAnalyticsEventsFor", () => {
  it("does not emit GA4 events for page_view", () => {
    expect(googleAnalyticsEventsFor("page_view", { page_type: "pricing" }, { pagePath: "/pricing" })).toEqual([]);
  });

  it("maps successful registration to sign_up, business_created and trial_started", () => {
    const properties = sanitizeTrackingProperties("registration_completed", {
      plan: "EQUIPO",
      intent: "trial",
      country: "CL",
      email: "owner@example.com",
      businessId: "biz_123",
    });
    const events = googleAnalyticsEventsFor("registration_completed", properties, { pagePath: "/register" });
    expect(events.map((event) => event.name)).toEqual(["sign_up", "business_created", "trial_started"]);
    expect(events.every((event) => !JSON.stringify(event.params).includes("owner@example.com"))).toBe(true);
    expect(events.every((event) => !JSON.stringify(event.params).includes("biz_123"))).toBe(true);
    expect(events[0]?.params).toMatchObject({ method: "email", plan: "EQUIPO", intent: "trial", country: "CL" });
  });

  it("does not emit trial_started for paid checkout registration", () => {
    const properties = sanitizeTrackingProperties("registration_completed", {
      plan: "INDIVIDUAL",
      intent: "subscription",
      country: "CL",
    });
    const names = googleAnalyticsEventsFor("registration_completed", properties, { pagePath: "/register" }).map((event) => event.name);
    expect(names).toEqual(["sign_up", "business_created"]);
  });

  it("does not map registration_started to sign_up", () => {
    const events = googleAnalyticsEventsFor("registration_started", { plan: "EQUIPO", intent: "trial" }, { pagePath: "/register" });
    expect(events.map((event) => event.name)).toEqual(["registration_started"]);
  });

  it("maps login_completed to login without identifiers", () => {
    expect(googleAnalyticsEventsFor(
      "login_completed",
      sanitizeTrackingProperties("login_completed", { email: "a@b.c" }),
      { pagePath: "/login" },
    )).toEqual([
      { name: "login", params: { method: "email" } },
    ]);
  });

  it("maps service selection to booking_started and successful booking to booking_completed", () => {
    const started = googleAnalyticsEventsFor(
      "booking_service_selected",
      sanitizeTrackingProperties("booking_service_selected", {
        booking_mode: "appointment",
        service_count: 1,
        has_deposit: true,
        has_options: false,
        customerName: "Ana",
      }),
      { pagePath: "/widget/soccerbarber" },
    );
    const completed = googleAnalyticsEventsFor(
      "booking_created",
      sanitizeTrackingProperties("booking_created", {
        has_deposit: true,
        service_count: 1,
        payment_required: false,
        clientId: "cli_9",
      }),
      { pagePath: "/widget/soccerbarber" },
    );

    expect(started).toEqual([{
      name: "booking_started",
      params: { booking_mode: "appointment", service_count: 1, has_deposit: true, has_options: false, booking_source: "widget" },
    }]);
    expect(completed[0]?.name).toBe("booking_completed");
    expect(completed[0]?.params).not.toHaveProperty("clientId");
  });

  it("maps register CTAs to sign_up_cta_clicked with the current public page", () => {
    const events = googleAnalyticsEventsFor(
      "landing_cta_clicked",
      sanitizeTrackingProperties("landing_cta_clicked", { cta: "register", placement: "hero" }),
      { pagePath: "/para/barberias" },
    );
    expect(events).toEqual([{
      name: "sign_up_cta_clicked",
      params: { source_page: "/para/barberias", cta_location: "hero" },
    }]);
  });

  it("does not treat pricing or demo CTAs as sign_up_cta_clicked", () => {
    const events = googleAnalyticsEventsFor(
      "landing_cta_clicked",
      sanitizeTrackingProperties("landing_cta_clicked", { cta: "pricing", placement: "final_cta" }),
      { pagePath: "/" },
    );
    expect(events[0]?.name).toBe("landing_cta_clicked");
  });
});

describe("toGoogleAnalyticsPagePath", () => {
  it("keeps public SEO URLs and collapses tokenized routes", () => {
    expect(toGoogleAnalyticsPagePath("/para/psicologos")).toBe("/para/psicologos");
    expect(toGoogleAnalyticsPagePath("/funciones/agenda-google-calendar")).toBe("/funciones/agenda-google-calendar");
    expect(toGoogleAnalyticsPagePath("/guias/cobrar-abonos-reservas-online")).toBe("/guias/cobrar-abonos-reservas-online");
    expect(toGoogleAnalyticsPagePath("/pricing")).toBe("/pricing");
    expect(toGoogleAnalyticsPagePath("/widget/soccerbarber")).toBe("/widget/[slug]");
    expect(toGoogleAnalyticsPagePath("/cita/secret-id")).toBe("/cita/[appointment]");
    expect(toGoogleAnalyticsPagePath("/s/private-token")).toBe("/s/[token]");
    expect(toGoogleAnalyticsPagePath("/dashboard/clients")).toBe("/dashboard/[section]");
    expect(toGoogleAnalyticsPagePath("/para/x7k9m2v4q8/tracking")).toBe("/other");
  });
});
