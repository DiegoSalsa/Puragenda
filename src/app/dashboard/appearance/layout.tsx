import { Palette } from "lucide-react";

export default function AppearanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Palette className="h-5 w-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apariencia</h1>
          <p className="text-sm text-muted-foreground">Diseña, previsualiza, publica y restaura tu widget de reservas.</p>
        </div>
      </div>
      {children}
    </div>
  );
}
