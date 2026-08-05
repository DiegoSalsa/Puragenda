import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/widget-assets.service", () => ({
  cleanupOrphanedWidgetAssets: vi.fn(),
}));

import { GET } from "@/app/api/cron/widget-assets-cleanup/route";
import { cleanupOrphanedWidgetAssets } from "@/server/services/widget-assets.service";

const originalCronSecret = process.env.CRON_SECRET;

describe("Widget asset cleanup cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "local-test-secret";
  });

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("fails closed when the cron secret is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("http://localhost/api/cron/widget-assets-cleanup"));
    expect(response.status).toBe(503);
    expect(cleanupOrphanedWidgetAssets).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid bearer token", async () => {
    const response = await GET(new Request("http://localhost/api/cron/widget-assets-cleanup", {
      headers: { authorization: "Bearer incorrect" },
    }));
    expect(response.status).toBe(401);
    expect(cleanupOrphanedWidgetAssets).not.toHaveBeenCalled();
  });

  it("runs the bounded cleanup for an authorized cron request", async () => {
    vi.mocked(cleanupOrphanedWidgetAssets).mockResolvedValueOnce({
      examined: 3,
      deleted: 2,
      failed: 1,
    });
    const response = await GET(new Request("http://localhost/api/cron/widget-assets-cleanup", {
      headers: { authorization: "Bearer local-test-secret" },
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      examined: 3,
      deleted: 2,
      failed: 1,
    });
    expect(cleanupOrphanedWidgetAssets).toHaveBeenCalledOnce();
  });
});
