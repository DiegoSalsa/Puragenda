import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({authorize:vi.fn(),tick:vi.fn()}));
vi.mock("@/server/commercial-worker",()=>({authorizeCommercialWorker:mocks.authorize,runCommercialTick:mocks.tick}));
import { GET, maxDuration } from "@/app/api/cron/puragenda-next/route";
describe("single commercial scheduler endpoint",()=>{
  beforeEach(()=>{vi.resetAllMocks();mocks.authorize.mockReturnValue(null);});
  it("preserves authentication failures without running work",async()=>{
    mocks.authorize.mockReturnValue(new Response(null,{status:401}));expect((await GET(new Request("https://www.puragenda.cl/api/cron/puragenda-next"))).status).toBe(401);expect(mocks.tick).not.toHaveBeenCalled();
  });
  it.each([false,true])("returns an observable failure for partial work (failed=%s)",async failed=>{
    mocks.tick.mockResolvedValue({stageErrors:failed?["V2_BILLING_RECOVERY_FAILED"]:[],billingFailed:0,proactiveFailed:0,receiptReconciliationFailed:false,v2Billing:{failed:0,exhausted:true}});
    const r=await GET(new Request("https://www.puragenda.cl/api/cron/puragenda-next"));expect(r.status).toBe(failed?503:200);expect(r.headers.get("cache-control")).toBe("no-store");expect((await r.json()).ok).toBe(!failed);
  });
  it("treats an overlapping lease as a successful no-op",async()=>{
    mocks.tick.mockResolvedValue({busy:true});const r=await GET(new Request("https://www.puragenda.cl/api/cron/puragenda-next"));expect(r.status).toBe(200);expect(await r.json()).toEqual({ok:true,busy:true});
  });
  it("does not reveal provider failures or credentials",async()=>{
    mocks.tick.mockRejectedValue(new Error("private-provider-context"));const r=await GET(new Request("https://www.puragenda.cl/api/cron/puragenda-next"));expect(r.status).toBe(503);expect(await r.json()).toEqual({code:"WORKER_TICK_FAILED"});expect(maxDuration).toBe(60);
  });
});
