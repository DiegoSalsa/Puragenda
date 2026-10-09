import { beforeEach, describe, expect, it, vi } from "vitest";

const m=vi.hoisted(()=>({manager:vi.fn(),ensure:vi.fn(),save:vi.fn(),business:vi.fn(),publish:vi.fn(),lock:vi.fn(),domain:vi.fn(),primary:vi.fn(),deactivate:vi.fn(),availability:vi.fn(),media:vi.fn(),website:vi.fn()}));

vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));

vi.mock("@/server/websites/service",()=>({requireWebsiteManager:m.manager,ensureWebsite:m.ensure}));

vi.mock("@/server/websites/billing",()=>({startWebsiteCheckout:vi.fn(),changeWebsiteBilling:vi.fn(),recoverWebsitePayment:vi.fn()}));

vi.mock("@/server/websites/domains",()=>({addWebsiteDomain:vi.fn(),customHostname:vi.fn(),verifyWebsiteDomain:vi.fn()}));

vi.mock("@/server/db/prisma",()=>{const tx={websiteMedia:{findMany:m.media},$queryRaw:m.lock,business:{findUniqueOrThrow:m.business},businessWebsite:{findUniqueOrThrow:m.website,updateMany:(args: {data: {publishedConfig?: unknown}})=> args.data.publishedConfig ? m.publish(args) : m.save(args)},websiteDomain:{findFirst:m.domain,updateMany:m.deactivate,update:m.primary}};return{prisma:{...tx,businessWebsite:{updateMany:m.save,findUnique:m.availability},$transaction:(work:(tx:unknown)=>unknown)=>work(tx)}};});

import { switchWebsiteTemplate,saveWebsiteDraft,publishWebsite,setPrimaryWebsiteDomain,websiteSubdomainAvailability } from "@/server/actions/website.actions";
import { effectiveWebsiteHeadline } from "@/websites/publishing";

import { fixtureView } from "@/websites/fixtures/views";
import { BELLA_PALETTES } from "@/websites/palettes";
import { pinkFixtureView } from "@/websites/fixtures/pink-y2k";
import { Prisma } from "@prisma/client";

describe("website draft, publication and ownership",()=>{

 beforeEach(()=>{vi.resetAllMocks();m.manager.mockResolvedValue({business:{id:"tenant-a",slug:"tenant-a"}});m.ensure.mockResolvedValue({id:"website-a",status:"DRAFT",subdomain:"tenant-a",draftConfig:fixtureView("a").config});m.media.mockResolvedValue([]);m.save.mockResolvedValue({count:1});m.publish.mockResolvedValue({count:1});m.business.mockResolvedValue({subscription:{status:"ACTIVE"},websiteAddon:{status:"ACTIVE",validUntil:new Date(Date.now()+86400000)},website:{id:"website-a",templateKey:"bella",templateVersion:1,revision:2,draftConfig:fixtureView("a").config}});});

 it("saves only the authenticated tenant draft with optimistic concurrency",async()=>{await saveWebsiteDraft(fixtureView("a").config,2,"tenant-a");expect(m.save).toHaveBeenCalledWith(expect.objectContaining({where:{id:"website-a",businessId:"tenant-a",revision:2},data:expect.not.objectContaining({publishedConfig:expect.anything()})}));m.save.mockResolvedValue({count:0});await expect(saveWebsiteDraft({},2,"tenant-a")).resolves.toEqual({error: "El borrador cambió en otra sesión. Recarga antes de guardar."});});
 it("saves and publishes Y2K through the existing tenant-scoped actions", async () => {
  const config = pinkFixtureView().config;
  const site = { id: "website-a", businessId: "tenant-a", templateKey: "y2k", templateVersion: 1, revision: 2, draftConfig: config };
  m.ensure.mockResolvedValue(site);
  expect(await saveWebsiteDraft(config, 2, "tenant-a", "y2k")).toEqual({ revision: 3 });
  expect(m.save).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "website-a", businessId: "tenant-a", revision: 2 }, data: expect.objectContaining({ templateConfigs: expect.objectContaining({ "y2k@1": config }) }) }));
  m.business.mockResolvedValue({ subscription: { status: "ACTIVE" }, websiteAddon: { status: "ACTIVE", validUntil: new Date(Date.now() + 86400000) }, website: { ...site, revision: 3 } });
  expect(await publishWebsite(3)).toBeUndefined();
  expect(m.publish).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ publishedTemplateKey: "y2k", publishedTemplateVersion: 1, publishedConfig: config, publishedRevision: 3 }) }));
 });
 it("refuses a foreign image in a Y2K draft", async () => {
  const config = pinkFixtureView().config;
  m.ensure.mockResolvedValue({ id: "website-a", templateKey: "y2k", templateVersion: 1, draftConfig: config });
  expect(await saveWebsiteDraft({ ...config, heroImage: "/website-media-qa/tenant-b/private.webp" }, 2, "tenant-a", "y2k")).toMatchObject({ error: expect.stringContaining("no pertenece") });
  expect(m.save).not.toHaveBeenCalled();
 });

 it("publishes one validated saved snapshot and rejects stale versions",async()=>{await publishWebsite(2);expect(m.publish).toHaveBeenCalledWith(expect.objectContaining({where:{id:"website-a",revision:2},data:expect.objectContaining({status:"PUBLISHED",publishedRevision:2,publishedConfig:expect.objectContaining({schemaVersion:2,galleryFilters:[],galleryCategories:expect.arrayContaining([expect.objectContaining({id:"cat-color"})])})})}));await expect(publishWebsite(1)).resolves.toEqual({error:"Recarga el borrador antes de publicar"});});

 it("refuses publication without paid access or a complete hero",async()=>{m.business.mockResolvedValue({subscription:{status:"ACTIVE"},websiteAddon:null});await expect(publishWebsite(2)).resolves.toEqual({error:"Activa el add-on y regulariza tu suscripción para publicar"});expect(m.publish).not.toHaveBeenCalled();});
 it("uses the effective fallback headline for publication requirements",()=>{expect(effectiveWebsiteHeadline({headline:" Título " ,copy:{hero:{fallbackHeadline:"Fallback"}}})).toBe("Título");expect(effectiveWebsiteHeadline({headline:"   ",copy:{hero:{fallbackHeadline:"Fallback"}}})).toBe("Fallback");expect(effectiveWebsiteHeadline({headline:"\t",copy:{hero:{fallbackHeadline:"  "}}})).toBe("");});
 it.each(["coral", "plum", "forest"] as const)("publishes the approved %s preset", async accent => {
  const config={...fixtureView("a").config,accent};
  m.business.mockResolvedValue({subscription:{status:"ACTIVE"},websiteAddon:{status:"ACTIVE",validUntil:new Date(Date.now()+86400000)},website:{id:"website-a",templateKey:"bella",templateVersion:1,revision:2,draftConfig:config}});
  expect(await publishWebsite(2)).toBeUndefined();expect(m.publish).toHaveBeenCalled();
 });
 it.each([true,false])("accepts custom palette only with sufficient contrast (%s)",async valid=>{
  const customPalette=valid?{primary:"#8B3525",text:"#FFFFFF",background:"#FAF8F2",ink:"#222222"}:{primary:"#FFFFFF",text:"#FFFFFF",background:"#FFFFFF",ink:"#FFFFFF"};
  const config={...fixtureView("a").config,paletteMode:"custom",customPalette};
  m.business.mockResolvedValue({subscription:{status:"ACTIVE"},websiteAddon:{status:"ACTIVE",validUntil:new Date(Date.now()+86400000)},website:{id:"website-a",templateKey:"bella",templateVersion:1,revision:2,draftConfig:config}});
  const result=await publishWebsite(2);if(valid){expect(result).toBeUndefined();expect(m.publish.mock.calls[0][0].data.publishedConfig.customPalette).toEqual(customPalette);}else{expect(result).toMatchObject({error:expect.stringContaining("contraste")});expect(m.publish).not.toHaveBeenCalled();}
  expect(BELLA_PALETTES).toHaveLength(3);
 });

 it.each([
  ["defined", "Título", "Fallback", true],
  ["fallback", "", "Título por defecto", true],
  ["empty", "", "", false],
  ["whitespace", "   ", "Fallback", true],
  ["all whitespace", "   ", "   ", false],
 ])("validates actual publication with %s headline",async(_name,headline,fallback,allowed)=>{
  const config=fixtureView("a").config;config.headline=headline;config.copy.hero.fallbackHeadline=fallback;
  m.business.mockResolvedValue({subscription:{status:"ACTIVE"},websiteAddon:{status:"ACTIVE",validUntil:new Date(Date.now()+86400000)},website:{id:"website-a",templateKey:"bella",templateVersion:1,revision:2,draftConfig:config}});
  const result=await publishWebsite(2);if(allowed){expect(result).toBeUndefined();expect(m.publish).toHaveBeenCalled();}else{expect(result).toMatchObject({error:expect.stringContaining("titular")});expect(m.publish).not.toHaveBeenCalled();}
 });
 it("cannot make another tenant domain primary",async()=>{m.domain.mockResolvedValue(null);await expect(setPrimaryWebsiteDomain("domain-b")).resolves.toEqual({error:"Dominio no activo"});expect(m.domain).toHaveBeenCalledWith({where:{id:"domain-b",status:"ACTIVE",tenantVerifiedAt:{not:null},website:{businessId:"tenant-a"}}});expect(m.primary).not.toHaveBeenCalled();});

 it("checks subdomain uniqueness against the authenticated business",async()=>{m.availability.mockResolvedValue({businessId:"tenant-b"});await expect(websiteSubdomainAvailability("tenant-b")).resolves.toMatchObject({available:false});m.availability.mockResolvedValue({businessId:"tenant-a"});await expect(websiteSubdomainAvailability("tenant-a")).resolves.toMatchObject({available:true});await expect(websiteSubdomainAvailability("www")).resolves.toMatchObject({available:false});});

});

describe("template switching",()=>{
 beforeEach(()=>{vi.resetAllMocks();m.manager.mockResolvedValue({business:{id:"tenant-a",slug:"tenant-a"}});m.website.mockResolvedValue({id:"website-a",businessId:"tenant-a",templateKey:"bella",templateVersion:1,revision:2,draftConfig:fixtureView("a").config,templateConfigs:{}});m.media.mockResolvedValue([]);m.save.mockResolvedValue({count:1});});
 it("saves the prior draft without modifying published identity or business data",async()=>{expect(await switchWebsiteTemplate("matchday",1,2)).toEqual({revision:3});expect(m.save).toHaveBeenCalledWith(expect.objectContaining({where:{id:"website-a",businessId:"tenant-a",revision:2},data:expect.objectContaining({templateKey:"matchday",templateConfigs:expect.objectContaining({"bella@1":expect.anything()})})}));expect(m.save.mock.calls[0][0].data).not.toHaveProperty("publishedConfig");expect(m.save.mock.calls[0][0].data).not.toHaveProperty("publishedTemplateKey");});
 it("selects Y2K without importing demo media or changing the live identity", async () => {
  expect(await switchWebsiteTemplate("y2k", 1, 2)).toEqual({ revision: 3 });
  const data = m.save.mock.calls[0][0].data;
  expect(data.templateKey).toBe("y2k");
  expect(data.draftConfig.displayName).toBe(fixtureView("a").config.displayName);
  expect(JSON.stringify(data)).not.toContain("/websites/pink-y2k/pink-dream.webp");
  expect(data).not.toHaveProperty("publishedTemplateKey");
 });
 it("rejects stale switch revisions before writing",async()=>{expect(await switchWebsiteTemplate("matchday",1,1)).toHaveProperty("error");expect(m.save).not.toHaveBeenCalled();});
 it("rejects unsupported versions before the transaction",async()=>{expect(await switchWebsiteTemplate("matchday",2,2)).toHaveProperty("error");expect(m.website).not.toHaveBeenCalled();});
 it("rejects a stale editor saving a different template",async()=>{m.ensure.mockResolvedValue({templateKey:"matchday",templateVersion:1});expect(await saveWebsiteDraft(fixtureView("a").config,2,"tenant-a","bella")).toHaveProperty("error");expect(m.save).not.toHaveBeenCalled();});
 it("explains a missing migration without changing the draft",async()=>{m.website.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Missing column",{code:"P2022",clientVersion:"7"}));expect(await switchWebsiteTemplate("matchday",1,2)).toEqual({error:"La base de datos necesita la migración de diseños web. No se aplicó el cambio."});expect(m.save).not.toHaveBeenCalled();});
});
