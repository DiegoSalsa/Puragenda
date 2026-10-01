import { beforeEach, describe, expect, it, vi } from "vitest";

const m=vi.hoisted(()=>({manager:vi.fn(),ensure:vi.fn(),save:vi.fn(),business:vi.fn(),publish:vi.fn(),lock:vi.fn(),domain:vi.fn(),primary:vi.fn(),deactivate:vi.fn(),availability:vi.fn()}));

vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));

vi.mock("@/server/websites/service",()=>({requireWebsiteManager:m.manager,ensureWebsite:m.ensure}));

vi.mock("@/server/websites/billing",()=>({startWebsiteCheckout:vi.fn(),changeWebsiteBilling:vi.fn(),recoverWebsitePayment:vi.fn()}));

vi.mock("@/server/websites/domains",()=>({addWebsiteDomain:vi.fn(),customHostname:vi.fn(),verifyWebsiteDomain:vi.fn()}));

vi.mock("@/server/db/prisma",()=>{const tx={$queryRaw:m.lock,business:{findUniqueOrThrow:m.business},businessWebsite:{updateMany:(args: {data: {publishedConfig?: unknown}})=> args.data.publishedConfig ? m.publish(args) : m.save(args)},websiteDomain:{findFirst:m.domain,updateMany:m.deactivate,update:m.primary}};return{prisma:{...tx,businessWebsite:{updateMany:m.save,findUnique:m.availability},$transaction:(work:(tx:unknown)=>unknown)=>work(tx)}};});

import { saveWebsiteDraft,publishWebsite,setPrimaryWebsiteDomain,websiteSubdomainAvailability } from "@/server/actions/website.actions";
import { effectiveWebsiteHeadline } from "@/websites/publishing";

import { fixtureView } from "@/websites/fixtures/views";

describe("website draft, publication and ownership",()=>{

 beforeEach(()=>{vi.resetAllMocks();m.manager.mockResolvedValue({business:{id:"tenant-a",slug:"tenant-a"}});m.ensure.mockResolvedValue({id:"website-a",status:"DRAFT",subdomain:"tenant-a",draftConfig:fixtureView("a").config});m.save.mockResolvedValue({count:1});m.publish.mockResolvedValue({count:1});m.business.mockResolvedValue({subscription:{status:"ACTIVE"},websiteAddon:{status:"ACTIVE",validUntil:new Date(Date.now()+86400000)},website:{id:"website-a",templateKey:"bella",templateVersion:1,revision:2,draftConfig:fixtureView("a").config}});});

 it("saves only the authenticated tenant draft with optimistic concurrency",async()=>{await saveWebsiteDraft(fixtureView("a").config,2,"tenant-a");expect(m.save).toHaveBeenCalledWith(expect.objectContaining({where:{id:"website-a",businessId:"tenant-a",revision:2},data:expect.not.objectContaining({publishedConfig:expect.anything()})}));m.save.mockResolvedValue({count:0});await expect(saveWebsiteDraft({},2,"tenant-a")).resolves.toEqual({error: "El borrador cambió en otra sesión. Recarga antes de guardar."});});

 it("publishes one validated saved snapshot and rejects stale versions",async()=>{await publishWebsite(2);expect(m.publish).toHaveBeenCalledWith(expect.objectContaining({where:{id:"website-a",revision:2},data:expect.objectContaining({status:"PUBLISHED",publishedRevision:2,publishedConfig:expect.objectContaining({schemaVersion:2,galleryFilters:[],galleryCategories:expect.arrayContaining([expect.objectContaining({id:"cat-color"})])})})}));await expect(publishWebsite(1)).resolves.toEqual({error:"Recarga el borrador antes de publicar"});});

 it("refuses publication without paid access or a complete hero",async()=>{m.business.mockResolvedValue({subscription:{status:"ACTIVE"},websiteAddon:null});await expect(publishWebsite(2)).resolves.toEqual({error:"Activa el add-on y regulariza tu suscripción para publicar"});expect(m.publish).not.toHaveBeenCalled();});
 it("uses the effective fallback headline for publication requirements",()=>{expect(effectiveWebsiteHeadline({headline:" Título " ,copy:{hero:{fallbackHeadline:"Fallback"}}})).toBe("Título");expect(effectiveWebsiteHeadline({headline:"   ",copy:{hero:{fallbackHeadline:"Fallback"}}})).toBe("Fallback");expect(effectiveWebsiteHeadline({headline:"\t",copy:{hero:{fallbackHeadline:"  "}}})).toBe("");});

 it("cannot make another tenant domain primary",async()=>{m.domain.mockResolvedValue(null);await expect(setPrimaryWebsiteDomain("domain-b")).resolves.toEqual({error:"Dominio no activo"});expect(m.domain).toHaveBeenCalledWith({where:{id:"domain-b",status:"ACTIVE",website:{businessId:"tenant-a"}}});expect(m.primary).not.toHaveBeenCalled();});

 it("checks subdomain uniqueness against the authenticated business",async()=>{m.availability.mockResolvedValue({businessId:"tenant-b"});await expect(websiteSubdomainAvailability("tenant-b")).resolves.toMatchObject({available:false});m.availability.mockResolvedValue({businessId:"tenant-a"});await expect(websiteSubdomainAvailability("tenant-a")).resolves.toMatchObject({available:true});await expect(websiteSubdomainAvailability("www")).resolves.toMatchObject({available:false});});

});
