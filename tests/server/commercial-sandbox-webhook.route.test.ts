import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const {processEvent, factory}=vi.hoisted(()=>({processEvent:vi.fn(async()=>({outcome:"APPLIED"})),factory:vi.fn(()=>({provider:"PADDLE"}))}));
vi.mock("@/server/commercial-billing/operations",()=>({processSandboxBillingWebhook:processEvent}));
vi.mock("@/server/commercial-billing/paddle-sandbox",()=>({createPaddleSandboxAdapter:factory}));
vi.mock("@/server/commercial-billing/mercadopago-sandbox",()=>({createMercadoPagoSandboxAdapter:factory}));
import {POST} from "@/app/api/internal/commercial-sandbox/webhooks/[provider]/route";
const request=()=>new NextRequest("http://127.0.0.1/api/internal/commercial-sandbox/webhooks/paddle",{method:"POST",body:"{}"});
const context={params:Promise.resolve({provider:"paddle"})};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("NODE_ENV","test");vi.stubEnv("DATABASE_URL","postgres://fixture@127.0.0.1/puragenda_commercial_test");vi.stubEnv("COMMERCIAL_V2_INTERNAL_WRITES","1");vi.stubEnv("COMMERCIAL_V2_SANDBOX_WEBHOOKS","0");});
afterEach(()=>vi.unstubAllEnvs());
describe("sandbox webhook HTTP boundary",()=>{
  it("is closed by default",async()=>{expect((await POST(request(),context)).status).toBe(404);expect(factory).not.toHaveBeenCalled();});
  it("cannot be enabled in a production process",async()=>{vi.stubEnv("NODE_ENV","production");vi.stubEnv("COMMERCIAL_V2_SANDBOX_WEBHOOKS","1");expect((await POST(request(),context)).status).toBe(404);expect(factory).not.toHaveBeenCalled();});
  it("returns retryable failure without private errors",async()=>{vi.stubEnv("COMMERCIAL_V2_SANDBOX_WEBHOOKS","1");processEvent.mockRejectedValueOnce(new Error("private-key-or-provider-reference"));const response=await POST(request(),context);expect(response.status).toBe(503);expect(await response.text()).not.toContain("private");});
  it("acknowledges only after the processor completed",async()=>{vi.stubEnv("COMMERCIAL_V2_SANDBOX_WEBHOOKS","1");expect((await POST(request(),context)).status).toBe(200);expect(processEvent).toHaveBeenCalledTimes(1);});
});
