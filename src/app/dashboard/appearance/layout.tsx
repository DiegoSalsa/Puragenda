
import { LocalizedText } from "@/components/i18n/localized-text";
import { Palette } from "lucide-react";

export default function AppearanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Palette className="h-5 w-5 text-brand-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><LocalizedText id="4-nLrMrsPSof" /></h1>
          <p className="text-sm text-muted-foreground"><LocalizedText id="vJlaQhIdse2F" /></p>
        </div>
      </div>
      {children}
    </div>
  );
}
