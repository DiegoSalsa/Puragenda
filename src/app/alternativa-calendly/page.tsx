import { AlternativeLanding } from "@/components/landing/seo/alternative-page";
import { getAlternative } from "@/lib/data/alternatives";
import { expansionMetadata } from "@/lib/seo-expansion";

const page = getAlternative("alternativa-calendly")!;
export const revalidate = 3600;
export const metadata = expansionMetadata({ title: page.title, description: page.description, path: "/" + page.slug });
export default function Page() { return <AlternativeLanding page={page} />; }
