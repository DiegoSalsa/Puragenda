import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import type { WebsiteView } from "../../types";
import BellaContent from "./BellaContent";
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--bella-display", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], variable: "--bella-body", display: "swap" });
export default function Bella({ view }: { view: WebsiteView }) {
  return <BellaContent view={view} fontClass={`${display.variable} ${body.variable}`} />;
}
