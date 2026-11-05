import {beforeEach, describe, expect, it, vi} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {WebsiteLaunchContext} from "@/websites/launch";
const m=vi.hoisted(()=>({setup:false}));
vi.mock("next-intl",()=>({useTranslations:()=> (key:string)=>key}));
vi.mock("next/navigation",()=>({usePathname:()=>"/dashboard",useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/components/dashboard/dashboard-overlay-context",()=>({useDashboardOverlay:()=>({isChangelogOpen:true,setChangelogOpen:vi.fn(),setupPriority:m.setup,activeHelp:null})}));
vi.mock("@/server/actions/dashboard.actions",()=>({markChangelogSeenAction:vi.fn()}));
vi.mock("@/server/actions/website-reminder.actions",()=>({dismissWebsiteTrialReminder:vi.fn()}));
vi.mock("@/lib/analytics/client",()=>({track:vi.fn()}));
vi.mock("@/components/brand/puri-mascot",()=>({PuriMascot:()=>null}));
vi.mock("@/components/dashboard/website-launch-popup",()=>({WebsiteLaunchPopup:()=>createElement("div",null,"Historical website announcement")}));
vi.mock("@/components/dashboard/changelog-launch-popup",()=>({ChangelogLaunchPopup:()=>null}));
import {ChangelogPopup} from "@/components/dashboard/changelog-popup";
import {CHANGELOG_DATA,LATEST_CHANGELOG_VERSION} from "@/config/changelog";
describe("Puragenda Next launch announcement",()=>{
  beforeEach(()=>{m.setup=false;});
  it("announces the release with current plan names, contracted professionals and preserved prices",()=>{
    const html=renderToStaticMarkup(createElement(ChangelogPopup));
    expect(LATEST_CHANGELOG_VERSION).toBe("v3.0.0"); expect(CHANGELOG_DATA[0].date).toBe("2026-11-05");
    expect(html).toContain("Llegó Puragenda Next"); expect(html).toContain("Puragenda y Puragenda+");
    expect(html).toContain("Esta actualización no aumenta el precio"); expect(html).toContain("profesionales");
    expect(html).toContain("Ver todas las novedades"); expect(html).not.toContain("Preguntas con contexto");
  });
  it("shows the new release ahead of the historical website popup",()=>{
    const html=renderToStaticMarkup(createElement(ChangelogPopup,{websiteLaunch:{} as WebsiteLaunchContext,releaseAnnouncementPending:true}));
    expect(html).toContain("Llegó Puragenda Next"); expect(html).not.toContain("Historical website announcement");
  });
  it("preserves historical notices after the release is seen",()=>{
    const html=renderToStaticMarkup(createElement(ChangelogPopup,{websiteLaunch:{} as WebsiteLaunchContext,releaseAnnouncementPending:false}));
    expect(html).toContain("Historical website announcement");
  });
  it("does not interrupt guided setup",()=>{
    m.setup=true; expect(renderToStaticMarkup(createElement(ChangelogPopup))).toBe("");
  });
});
