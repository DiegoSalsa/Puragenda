import {describe,expect,it,vi} from "vitest";
import {invokeCommercialWorker} from "../../ops/commercial-scheduler/worker.mjs";
const env={SCHEDULER_ENABLED:"1",PURAGENDA_WORKER_URL:"https://www.puragenda.cl/api/cron/puragenda-next",COMMERCIAL_WORKER_SECRET:"synthetic-scheduler-secret-at-least-thirty-two"};
describe("single external scheduler",()=>{
  it("defaults off without contacting any target",async()=>{const f=vi.fn();expect(await invokeCommercialWorker({...env,SCHEDULER_ENABLED:"0"},f)).toEqual({disabled:true});expect(f).not.toHaveBeenCalled();});
  it("cannot send the bearer secret to another origin",async()=>{const f=vi.fn();await expect(invokeCommercialWorker({...env,PURAGENDA_WORKER_URL:"https://other.example/"},f)).rejects.toThrow("SCHEDULER_CONFIGURATION_REQUIRED");expect(f).not.toHaveBeenCalled();});
  it("uses the dedicated bearer and refuses redirects",async()=>{const f=vi.fn().mockResolvedValue(new Response(null,{status:302}));await expect(invokeCommercialWorker(env,f)).rejects.toThrow("PURAGENDA_SCHEDULER_FAILED");expect(f).toHaveBeenCalledOnce();expect(f.mock.calls[0][1]).toMatchObject({headers:{Authorization:`Bearer ${env.COMMERCIAL_WORKER_SECRET}`},redirect:"manual"});});
  it("retries a server failure once and lets the application enforce idempotency",async()=>{const f=vi.fn().mockResolvedValueOnce(new Response(null,{status:503})).mockResolvedValueOnce(new Response(null,{status:200}));expect(await invokeCommercialWorker(env,f,async()=>{})).toEqual({ok:true,attempts:2});expect(f).toHaveBeenCalledTimes(2);});
  it("fails observably after two transport failures without logging secrets",async()=>{const f=vi.fn().mockRejectedValue(new Error("synthetic-private-provider-error"));await expect(invokeCommercialWorker(env,f,async()=>{})).rejects.toThrow("PURAGENDA_SCHEDULER_FAILED");expect(f).toHaveBeenCalledTimes(2);});
});
