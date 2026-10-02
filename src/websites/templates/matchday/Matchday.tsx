"use client";
import { Oswald, Manrope } from "next/font/google";
import type { WebsiteView } from "../../types";
import type { MatchdayConfig } from "./config";
import Content from "./Content";
const display = Oswald({ subsets: ["latin"], variable: "--matchday-display", display: "swap", preload: false });
const body = Manrope({ subsets: ["latin"], variable: "--matchday-body", display: "swap", preload: false });
export default function Matchday({ view }: { view: WebsiteView<MatchdayConfig> }) {
  return <Content view={view} fontClass={`${display.variable} ${body.variable}`} />;
}
