import { describe, expect, it } from "vitest";
import {
  DEMO_EMAIL,
  DEMO_SESSION_MAX_AGE_SECONDS,
  getDemoSessionCookieOptions,
  isDemoAccountEmail,
} from "@/server/auth/demo-session";

describe("demo session", () => {
  it("recognizes the Bella demo account without depending on casing or whitespace", () => {
    expect(isDemoAccountEmail(`  ${DEMO_EMAIL.toUpperCase()} `)).toBe(true);
    expect(isDemoAccountEmail("someone@example.test")).toBe(false);
  });

  it("keeps the public demo session for one year while retaining httpOnly/lax defaults", () => {
    const options = getDemoSessionCookieOptions();
    expect(DEMO_SESSION_MAX_AGE_SECONDS).toBe(365 * 24 * 60 * 60);
    expect(options.maxAge).toBe(DEMO_SESSION_MAX_AGE_SECONDS);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
  });
});
