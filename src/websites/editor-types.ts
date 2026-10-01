import type { WebsiteView } from "./types";
import type { EditorAddon, EditorPrice } from "@/app/dashboard/website/billing-panel";
import type { EditorDomain } from "@/app/dashboard/website/domain-panel";
export type WebsiteEditorProps<C> = {
  initial: C; view: WebsiteView<C>; templateKey: string; templateVersion: number;
  revision: number; publishedRevision: number | null; subdomain: string; rootDomain: string; publicUrl: string; status: string;
  addon: EditorAddon; price: EditorPrice; domains: EditorDomain[]; requests: { id: string; hostname: string; status: string }[]; canManageDomains: boolean;
};
