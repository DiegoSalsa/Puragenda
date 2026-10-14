import { DynaPuff, Caveat, Lobster } from "next/font/google";

export const pinkDisplay = DynaPuff({ subsets: ["latin"], variable: "--pink-display", display: "swap", preload: false });
export const pinkHandwriting = Caveat({ subsets: ["latin"], variable: "--pink-hand", display: "swap", preload: false });
export const pinkScript = Lobster({ weight: "400", subsets: ["latin"], variable: "--pink-script", display: "swap", preload: false });
