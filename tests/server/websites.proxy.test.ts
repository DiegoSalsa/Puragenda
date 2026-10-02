import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
describe("website host routing",()=>{
 beforeEach(()=>{vi.stubEnv("WEBSITE_ROOT_DOMAIN","localhost");vi.stubEnv("__NEXT_NO_MIDDLEWARE_URL_NORMALIZE","1");});
 it("rewrites to the actual tenant while replacing injected internal headers",()=>{const result=proxy(new NextRequest("http://localhost:3005/",{headers:{host:"bella-a.localhost:3005","x-puragenda-website-host":"bella-b.localhost:3005"}}));expect(result.headers.get("x-middleware-rewrite")).toBe("http://localhost:3005/sites/bella-a.localhost");expect(result.headers.get("x-middleware-request-x-puragenda-website-host")).toBe("bella-a.localhost:3005");});
 it("does not expose dashboard, admin or direct site paths on tenant hosts",()=>{for(const path of ["/dashboard/website/preview","/para/x7k9m2v4q8","/sites/bella-b.localhost"])expect(proxy(new NextRequest(`http://localhost:3005${path}`,{headers:{host:"bella-a.localhost:3005"}})).status).toBe(404);});
 it("removes a spoofed host on direct internal paths from the platform",()=>{const result=proxy(new NextRequest("http://localhost:3005/sites/bella-b.localhost",{headers:{host:"localhost:3005","x-puragenda-website-host":"bella-b.localhost"}}));expect(result.headers.get("x-middleware-request-x-puragenda-website-host")).toBe("localhost:3005");});
 it("never treats x-forwarded-host as the selected tenant",()=>{const result=proxy(new NextRequest("http://localhost:3005/",{headers:{host:"localhost:3005","x-forwarded-host":"bella-b.localhost"}}));expect(result.headers.get("x-middleware-rewrite")).toBeNull();});
});
