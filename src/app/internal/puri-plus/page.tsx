import { PuriPlusWorkspace } from "@/components/dashboard/puri-plus/workspace";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/crawler-policy";
export const metadata = { title: "Puri+ · prueba interna", robots: PRIVATE_PAGE_ROBOTS };
export const dynamic = "force-dynamic";
export default function Page(props: { searchParams: Promise<{ location?: string }> }) { return <PuriPlusWorkspace {...props} />; }
