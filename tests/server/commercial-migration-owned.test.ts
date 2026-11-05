import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),business:vi.fn(),prepare:vi.fn(),approve:vi.fn(),read:vi.fn(),guard:vi.fn()}));
vi.mock("@/server/auth/user-session",()=>({getCurrentSessionUser:mocks.user}));
vi.mock("@/server/services/business.service",()=>({getBusinessForUser:mocks.business}));
vi.mock("@/server/db/prisma",()=>({prisma:{commercialMigrationProposal:{findFirstOrThrow:mocks.read}}}));
vi.mock("@/server/commercial-migration/service",()=>({prepareCommercialMigration:mocks.prepare,approveCommercialMigration:mocks.approve,
  getCommercialMigrationStatus:vi.fn(),assertMigrationSandbox:mocks.guard}));
import {prepareOwnedCommercialMigration,approveOwnedCommercialMigration,readOwnedCommercialMigration} from "@/server/commercial-migration/owned";
const request={plan:"PURAGENDA_PLUS",professionalTotal:2,effectiveAt:"2026-12-01T00:00:00Z",idempotencyKey:"fixture-request"};
describe("migration owner authorization and mass assignment boundary",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue({id:"owner-a",role:"ADMIN"});mocks.business.mockResolvedValue({id:"business-a",ownerId:"owner-a",deletedAt:null});
    mocks.prepare.mockResolvedValue({id:"proposal-a",status:"BLOCKED",previewHash:"a".repeat(64)});mocks.approve.mockResolvedValue({id:"proposal-a",status:"PENDING_PROVIDER_CHANGE",reason:null});});
  it("derives tenant and actor from session, using the shared server quote",async()=>{
    await prepareOwnedCommercialMigration(request);
    expect(mocks.prepare).toHaveBeenCalledWith({...request,effectiveAt:new Date(request.effectiveAt),businessId:"business-a",actorId:"owner-a"});
  });
  it.each([{businessId:"victim"},{price:1},{status:"APPLIED"},{fixtureReview:{tax:true}},{provider:"PADDLE"}])("rejects extra commercial input %#",async extra=>{
    await expect(prepareOwnedCommercialMigration({...request,...extra})).rejects.toThrow();expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("requires explicit approval of the exact persisted preview hash",async()=>{
    await approveOwnedCommercialMigration({id:"proposal-a",previewHash:"a".repeat(64),confirmed:true});
    expect(mocks.approve).toHaveBeenCalledWith("business-a","owner-a","proposal-a","a".repeat(64),true);
    await expect(approveOwnedCommercialMigration({id:"proposal-a",previewHash:"a".repeat(64),confirmed:true,effectiveAt:request.effectiveAt})).rejects.toThrow();
    await expect(approveOwnedCommercialMigration({id:"proposal-a",previewHash:"a".repeat(64),confirmed:false})).rejects.toThrow();
  });
  it("rejects unauthenticated users, foreign owners and staff administrators",async()=>{
    mocks.user.mockResolvedValue(null);await expect(prepareOwnedCommercialMigration(request)).rejects.toThrow("UNAUTHENTICATED");
    mocks.user.mockResolvedValue({id:"staff",role:"ADMIN"});await expect(prepareOwnedCommercialMigration(request)).rejects.toThrow("OWNER_REQUIRED");
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("scopes proposal reads to the session business",async()=>{
    mocks.read.mockRejectedValue(new Error("not found"));await expect(readOwnedCommercialMigration("foreign-proposal")).rejects.toThrow("not found");
    expect(mocks.read).toHaveBeenCalledWith({where:{id:"foreign-proposal",businessId:"business-a"}});
  });
  it("fails closed before invoking services outside the isolated sandbox",async()=>{
    mocks.guard.mockImplementationOnce(()=>{throw new Error("MIGRATION_WRITES_DISABLED");});
    await expect(prepareOwnedCommercialMigration(request)).rejects.toThrow("MIGRATION_WRITES_DISABLED");expect(mocks.prepare).not.toHaveBeenCalled();
  });
});
