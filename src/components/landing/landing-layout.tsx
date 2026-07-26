"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/landing/navbar";
import type { LandingIdentityProps } from "@/components/landing/types";

const Footer = dynamic(() => import("@/components/landing/footer").then((m) => m.Footer), { ssr: true });

export const neoVars: React.CSSProperties & Record<string, string> = {
  "--primary": "#7C3AED",
  "--primary-foreground": "#FFFFFF",
  "--secondary": "#FFF5BA",
  "--secondary-foreground": "#0F172A",
  "--muted": "#FFF5BA",
  "--muted-foreground": "#4A4A4A",
  "--accent": "#7C3AED",
  "--accent-foreground": "#FFFFFF",
  "--ring": "#7C3AED",
};

export function LandingLayout({ children, user, business }: LandingIdentityProps & { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#FFFAEB] text-black dark:bg-[#111111] dark:text-white font-sans selection:bg-[#B28DFF] dark:selection:text-black transition-colors duration-300" style={neoVars}>
      <Navbar user={user} business={business} />
      <main className="relative z-10 pt-24 pb-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
