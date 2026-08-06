
import { LocalizedText } from "@/components/i18n/localized-text";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-6">
      <p className="text-8xl font-black text-muted-foreground/20 select-none">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight"><LocalizedText id="ZtRo1EUffjZ6" /></h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          <LocalizedText id="zCvykjuL1Tvm" />
        </p>
      </div>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <LocalizedText id="BHXoUm1Myxdt" />
      </Link>
    </div>
  );
}
