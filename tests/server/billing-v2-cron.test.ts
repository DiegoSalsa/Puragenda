import {beforeEach,describe,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({authorize:vi.fn(),run:vi.fn()}));
vi.mock("@/server/auth/cron",()=>({authorizeCronRequest:m.authorize}));
vi.mock("@/server/commercial-billing/mercadopago-v2",()=>({runMpV2Reconciliation:m.run}));
import {GET} from "@/app/api/cron/billing-v2-reconciliation/route";
describe("subscription recovery independent of marketing",()=>{
  beforeEach(()=>{vi.resetAllMocks();m.authorize.mockReturnValue(null);});
  it("requires cron authorization before billing access",async()=>{
    m.authorize.mockReturnValue(new Response(null,{status:401}));expect((await GET(new Request("https://example.test/api/cron/billing-v2-reconciliation"))).status).toBe(401);expect(m.run).not.toHaveBeenCalled();
  });
  it("runs bounded billing recovery with marketing left disabled",async()=>{
    m.run.mockResolvedValue({failed:0,completed:2});const r=await GET(new Request("https://example.test/api/cron/billing-v2-reconciliation"));expect(r.status).toBe(200);expect(m.run).toHaveBeenCalledWith(undefined,{limit:2,maxRequests:12,maxDurationMs:8000});
  });
  it("reports retryable failures without leaking provider details",async()=>{
    m.run.mockRejectedValue(new Error("private-provider-detail"));const r=await GET(new Request("https://example.test/api/cron/billing-v2-reconciliation"));expect(r.status).toBe(503);expect(await r.text()).not.toContain("private-provider-detail");
  });
});
