import { createHash, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { distributedRateLimit } from "@/server/lib/distributed-rate-limit";
const suite=describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
suite("Audit05 distributed financial abuse control",()=>{
  afterAll(async()=>{vi.unstubAllEnvs();await prisma.$disconnect();});
  it("two independent instances share one atomic PostgreSQL budget",async()=>{
    const namespace=`audit05-${randomUUID()}`,options={namespace,windowMs:900000,max:5,message:"synthetic billing limit",trustedProxyOnly:true};
    vi.stubEnv("TRUST_PROXY_HEADERS","1");
    const a=distributedRateLimit(options),b=distributedRateLimit(options),req=new NextRequest("http://127.0.0.1/api/billing/subscribe",{headers:{"x-forwarded-for":"192.0.2.5"}});
    const results=await Promise.all(Array.from({length:12},(_,i)=>(i%2?a:b).check(req)));
    expect(results.filter(x=>x===null)).toHaveLength(5);expect(results.filter(x=>x?.status===429)).toHaveLength(7);
    const key=createHash("sha256").update(`${namespace}:192.0.2.5`).digest("hex");
    await prisma.apiRateLimitBucket.delete({where:{key}});
  });
});
