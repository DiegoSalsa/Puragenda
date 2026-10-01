import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VercelDomainProvider, websiteDomainProvider } from "@/server/websites/domain-provider";
const m = vi.hoisted(() => ({ manager: vi.fn(), site: vi.fn(), find: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), query: vi.fn() }));
vi.mock("@/server/websites/service", () => ({ requireWebsiteManager: m.manager, websiteRootDomain: () => "puragenda.cl" }));
vi.mock("@/server/db/prisma", () => { const db = { businessWebsite: { findUniqueOrThrow: m.site }, websiteDomain: { findFirst: m.find, count: m.count, create: m.create, update: m.update, delete: m.remove }, $queryRaw: m.query }; return { prisma: { ...db, $transaction: (callback: (db: unknown) => unknown) => callback(db) } }; });
import { addWebsiteDomain, customHostname, pendingDomainAdapter, removeWebsiteDomain, verifyWebsiteDomain } from "@/server/websites/domains";
const dns = vi.hoisted(() => ({ txt: vi.fn() }));
vi.mock("node:dns/promises", () => ({ resolveTxt: dns.txt }));
const project = { name: "studio.cl", apexName: "studio.cl", projectId: "prj_qa", verified: false, verification: [{ type: "TXT", domain: "_vercel.studio.cl", value: "provider-challenge" }] };
const configuration = { misconfigured: true, configuredBy: null, recommendedCNAME: [{ rank: 1, value: "dynamic.vercel-dns-qa.com" }], recommendedIPv4: [{ rank: 1, value: ["192.0.2.27"] }] };
beforeEach(() => { vi.resetAllMocks(); m.manager.mockResolvedValue({ business: { id: "tenant-a" } }); m.site.mockResolvedValue({ id: "website-a" }); m.count.mockResolvedValue(0); m.create.mockResolvedValue({ id: "domain-a" }); m.update.mockImplementation(async ({ data }) => ({ id: "domain-a", ...data })); });
afterEach(() => vi.unstubAllEnvs());
describe("Vercel domain provider", () => {
  it("derives routing and ownership DNS values from provider responses", async () => { const transport = vi.fn().mockResolvedValueOnce(Response.json(project)).mockResolvedValueOnce(Response.json(configuration)); const result = await new VercelDomainProvider("test-token", "prj_qa", "team_qa", transport).getDomainStatus("studio.cl"); expect(result.records).toEqual([{ type: "TXT", name: "_vercel.studio.cl", value: "provider-challenge" }, { type: "A", name: "studio.cl", value: "192.0.2.27" }]); expect(result.active).toBe(false); expect(String(transport.mock.calls[1][0])).toContain("/v6/domains/studio.cl/config?teamId=team_qa"); });
  it("uses dynamic CNAME for subdomains and activates only verified configured project domains", async () => { const transport = vi.fn().mockResolvedValueOnce(Response.json({ ...project, name: "www.studio.cl", verified: true })).mockResolvedValueOnce(Response.json({ ...configuration, misconfigured: false, configuredBy: "CNAME" })); const result = await new VercelDomainProvider("token", "prj_qa", undefined, transport).getDomainStatus("www.studio.cl"); expect(result.active).toBe(true); expect(result.records.at(-1)).toEqual({ type: "CNAME", name: "www.studio.cl", value: "dynamic.vercel-dns-qa.com" }); });
  it("does not activate partial DNS or another project", async () => { const transport = vi.fn().mockResolvedValueOnce(Response.json({ ...project, verified: true })).mockResolvedValueOnce(Response.json(configuration)); expect((await new VercelDomainProvider("token", "prj_qa", undefined, transport).getDomainStatus("studio.cl")).active).toBe(false); transport.mockResolvedValueOnce(Response.json({ ...project, projectId: "prj_other" })).mockResolvedValueOnce(Response.json(configuration)); await expect(new VercelDomainProvider("token", "prj_qa", undefined, transport).getDomainStatus("studio.cl")).rejects.toThrow("esperado"); });
  it("calls ownership verification before treating a challenge as complete", async () => { const transport = vi.fn().mockResolvedValueOnce(Response.json(project)).mockResolvedValueOnce(Response.json({ ...project, verified: true })).mockResolvedValueOnce(Response.json({ ...project, verified: true })).mockResolvedValueOnce(Response.json({ ...configuration, configuredBy: "A", misconfigured: false })); const result = await new VercelDomainProvider("token", "prj_qa", undefined, transport).verifyDomain("studio.cl"); expect(result.active).toBe(true); expect(transport.mock.calls[1][1]?.method).toBe("POST"); expect(String(transport.mock.calls[1][0])).toContain("/verify"); });
  it("handles provider conflicts and timeouts without revealing credentials", async () => { const transport = vi.fn().mockResolvedValue(new Response("secret raw error", { status: 409 })); await expect(new VercelDomainProvider("private-token", "prj_qa", undefined, transport).addDomain("studio.cl")).rejects.toThrow("verificación"); transport.mockRejectedValue(new Error("private-token timeout")); await expect(new VercelDomainProvider("private-token", "prj_qa", undefined, transport).getDomainStatus("studio.cl")).rejects.toThrow("tardando"); });
  it("refuses external writes without an explicit enablement, even with a token", () => { vi.stubEnv("VERCEL_TOKEN", "secret"); vi.stubEnv("VERCEL_PROJECT_ID", "prj_qa"); vi.stubEnv("WEBSITE_DOMAIN_PROVIDER", "vercel"); vi.stubEnv("WEBSITE_VERCEL_WRITES_ENABLED", ""); expect(() => websiteDomainProvider()).toThrow("habilitada"); });
  it("removes only the domain on the configured project", async () => { const transport = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); await new VercelDomainProvider("token", "prj_qa", undefined, transport).removeDomain("studio.cl"); expect(transport.mock.calls[0][1]?.method).toBe("DELETE"); expect(String(transport.mock.calls[0][0])).toContain("/v9/projects/prj_qa/domains/studio.cl"); });
  it("rejects another project before issuing a provider verification POST", async () => {
    const transport = vi.fn().mockResolvedValue(Response.json({ ...project, projectId: "other" }));
    await expect(new VercelDomainProvider("token", "prj_qa", undefined, transport).verifyDomain("studio.cl")).rejects.toThrow("esperado");
    expect(transport).toHaveBeenCalledTimes(1);expect(transport.mock.calls[0][1]?.method).toBe("GET");
  });
});
describe("domain tenant ownership", () => {
  it("checks the exact TXT token, including split DNS chunks", async () => {
    dns.txt.mockResolvedValue([["puragenda-verify=", "tenant-a"]]);
    expect((await pendingDomainAdapter.check("studio.cl", "puragenda-verify=tenant-a")).verified).toBe(true);
    expect((await pendingDomainAdapter.check("studio.cl", "puragenda-verify=tenant-b")).verified).toBe(false);
    expect(dns.txt).toHaveBeenCalledWith("_puragenda.studio.cl");
  });
  it("does not reconcile a same-project domain with an incorrect tenant challenge", async () => {
    m.find.mockResolvedValue({ id: "domain-a", hostname: "studio.cl", verificationToken: "puragenda-verify=tenant-a", provider: "pending" });
    const provider = { key: "mock" as const, addDomain: vi.fn(), getDomainStatus: vi.fn(), verifyDomain: vi.fn(), removeDomain: vi.fn() };
    await verifyWebsiteDomain("domain-a", { check: vi.fn().mockResolvedValue({ verified: false, active: true, message: "wrong TXT" }) }, provider);
    expect(provider.addDomain).not.toHaveBeenCalled(); expect(provider.verifyDomain).not.toHaveBeenCalled();
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", tenantVerifiedAt: null, verifiedAt: null, activatedAt: null }) }));
  });
  it("reconciles only after tenant TXT proof and requires provider routing for ACTIVE", async () => {
    m.find.mockResolvedValue({ id: "domain-a", hostname: "studio.cl", verificationToken: "puragenda-verify=tenant-a", provider: "pending" });
    const check = vi.fn().mockResolvedValue({ verified: true, active: false, message: "TXT OK" });
    const provider = { key: "mock" as const, addDomain: vi.fn().mockRejectedValue(new Error("already in shared project")), getDomainStatus: vi.fn(), verifyDomain: vi.fn().mockResolvedValue({ verified: true, active: false, records: [], message: "DNS pending" }), removeDomain: vi.fn() };
    await verifyWebsiteDomain("domain-a", { check }, provider);
    expect(check.mock.invocationCallOrder[0]).toBeLessThan(provider.addDomain.mock.invocationCallOrder[0]);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "VERIFIED", activatedAt: null }) }));
    provider.verifyDomain.mockResolvedValue({ verified: true, active: true, records: [], message: "DNS OK" });
    await verifyWebsiteDomain("domain-a", { check }, provider);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) }));
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantVerifiedAt: expect.any(Date) }) }));
  });
  it("removes an unproven legacy reservation without deleting a shared provider domain", async () => {
    m.find.mockResolvedValue({ id: "domain-a", hostname: "studio.cl", provider: "vercel", tenantVerifiedAt: null });
    await removeWebsiteDomain("domain-a"); expect(m.remove).toHaveBeenCalledWith({ where: { id: "domain-a" } });
  });
  it("rejects platform domains, IPs, reserved labels and invalid hostnames", () => { for (const host of ["puragenda.cl", "other.puragenda.cl", "foo.vercel.app", "127.0.0.1", "localhost", "studio.test", "https://studio.cl", "*.studio.cl"]) expect(() => customHostname(host)).toThrow(); expect(customHostname("STUDIO.CL")).toBe("studio.cl"); });
  it("reserves unique hostnames before provider writes and checks the tenant limit", async () => { const provider = { key: "mock" as const, addDomain: vi.fn(), getDomainStatus: vi.fn(), verifyDomain: vi.fn(), removeDomain: vi.fn() }; m.create.mockRejectedValue(new Error("unique hostname")); await expect(addWebsiteDomain("studio.cl", provider)).rejects.toThrow("unique"); expect(provider.addDomain).not.toHaveBeenCalled(); m.count.mockResolvedValue(5); await expect(addWebsiteDomain("studio.cl", provider)).rejects.toThrow("5 dominios"); });
  it("creates a tenant-specific TXT challenge before any provider adoption", async () => { const provider = { key: "mock" as const, addDomain: vi.fn(), getDomainStatus: vi.fn(), verifyDomain: vi.fn(), removeDomain: vi.fn() }; await addWebsiteDomain("studio.cl", provider); const data = m.create.mock.calls[0][0].data; expect(data).toMatchObject({ provider: "pending", verificationToken: expect.stringMatching(/^puragenda-verify=/), dnsRecords: [{ type: "TXT", name: "_puragenda.studio.cl" }] }); expect(provider.addDomain).not.toHaveBeenCalled(); });
  it("does not verify or remove another tenant's domain", async () => { m.find.mockResolvedValue(null); const adapter = { check: vi.fn() }; await expect(verifyWebsiteDomain("domain-b", adapter)).rejects.toThrow("encontrado"); await expect(removeWebsiteDomain("domain-b")).rejects.toThrow("encontrado"); expect(m.find).toHaveBeenCalledWith({ where: { id: "domain-b", website: { businessId: "tenant-a" } } }); expect(adapter.check).not.toHaveBeenCalled(); expect(m.remove).not.toHaveBeenCalled(); });
  it("requires BOTH ownership and routing for ACTIVE", async () => { m.find.mockResolvedValue({ id: "domain-a", hostname: "studio.cl", verificationToken: "token" }); await verifyWebsiteDomain("domain-a", { check: vi.fn().mockResolvedValue({ verified: false, active: true, message: "waiting" }) }); expect(m.update.mock.calls[0][0].data.status).toBe("PENDING"); });
});
