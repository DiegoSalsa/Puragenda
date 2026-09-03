import Link from "next/link";
import { LocalizedText } from "@/components/i18n/localized-text";
import { LanguageSwitcher } from "@/components/language-switcher";
import { startDemoAction } from "@/server/actions/demo.actions";

export default function DemoPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <Link href="/" className="mx-auto flex w-fit items-center gap-3">
          <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda Logo" className="h-16 w-auto -my-3" />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-bold">
              <LocalizedText id="vP-8OnnRFj1a" />
            </h1>
            <p className="text-sm text-muted-foreground">
              <LocalizedText id="0-9SNZCT992I" />
            </p>
          </div>

          <form action={startDemoAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-xl bg-[#7C3AED] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6]"
            >
              <LocalizedText id="vP-8OnnRFj1a" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
