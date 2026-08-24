
import { LocalizedText } from "@/components/i18n/localized-text";
import { LandingLayout } from "@/components/landing/landing-layout";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Scissors, Sparkles, CheckCircle2, TrendingUp, Users2, Clock, PackageCheck } from "@/components/icons/hover-icons";
import { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Soluciones por industria",
  description: "Descubre cómo Puragenda se adapta a las necesidades específicas de tu rubro.",
  alternates: { canonical: absoluteUrl("/soluciones") },
};

const metrics = [
  { value: "24/7", label: "Reservas fuera de horario", icon: Clock, bg: "bg-[#FFB5E8]" },
  { value: "1 panel", label: "Agenda, clientes y pagos", icon: Users2, bg: "bg-[#FFF5BA]" },
  { value: "Tu marca", label: "Widget personalizable", icon: TrendingUp, bg: "bg-[#BFFCC6]" },
];

export default async function SolucionesPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          <LocalizedText id="S5jQCu9nrDb_" />
        </h1>
        <p className="text-xl font-bold mb-16 opacity-80 max-w-3xl mx-auto">
          <LocalizedText id="XaaVBSSUhVPw" />
        </p>
      </section>

      {/* Zig Zag Layouts */}
      <section className="mx-auto w-full max-w-6xl px-6 space-y-24 py-12">
        {/* Barberias */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 bg-[#FFF5BA] dark:bg-black border-4 border-black dark:border-white p-8 rounded-3xl shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#FFF5BA]">
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-xl p-4">
              <div className="flex gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500 border-2 border-black"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500 border-2 border-black"></div>
                <div className="h-3 w-3 rounded-full bg-green-500 border-2 border-black"></div>
              </div>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded border-2 border-black dark:border-white w-3/4"></div>
                <div className="h-8 bg-[#FFF5BA] text-black font-black flex items-center px-2 rounded border-2 border-black w-full"><LocalizedText id="I9ewL8g7MpaJ" /></div>
                <div className="h-8 bg-[#85E3FF] text-black font-black flex items-center px-2 rounded border-2 border-black w-5/6"><LocalizedText id="bK77dZuab_CO" /></div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#FFF5BA] text-black shadow-[4px_4px_0_#000]">
              <Scissors className="h-8 w-8" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter"><LocalizedText id="rp-1suXzUbxC" /></h2>
            <p className="text-lg font-bold opacity-80">
              <LocalizedText id="cEiOP-zt3LzF" />
            </p>
            <ul className="space-y-2 font-bold">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> <LocalizedText id="bmAZN4ZcWV4B" /></li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> <LocalizedText id="czYWUXRUyFd1" /></li>
            </ul>
            <Link href="/para/barberias" className="inline-flex font-black uppercase text-[#7C3AED] hover:underline">
              <LocalizedText id="NON2NMBZVy8O" />
            </Link>
          </div>
        </div>

        {/* Estetica */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#85E3FF] text-black shadow-[4px_4px_0_#000]">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter"><LocalizedText id="c1Rzec5sk8ev" /></h2>
            <p className="text-lg font-bold opacity-80">
              <LocalizedText id="EfwNfuH1yoOh" />
            </p>
            <ul className="space-y-2 font-bold">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> <LocalizedText id="EoHfjFKiJkE7" /></li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> <LocalizedText id="att0xgfKJxDi" /></li>
            </ul>
            <Link href="/para/estetica" className="inline-flex font-black uppercase text-[#7C3AED] hover:underline">
              <LocalizedText id="CItQIrz-F7B3" />
            </Link>
          </div>
          <div className="bg-[#85E3FF] dark:bg-black border-4 border-black dark:border-white p-8 rounded-3xl shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#85E3FF]">
             <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-xl p-4 rotate-3">
              <div className="font-black uppercase border-b-4 border-black dark:border-white pb-2 mb-2 dark:text-white text-black"><LocalizedText id="Unh-gHk6V0Gy" /></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full border-2 border-black bg-[#FFB5E8]"></div>
                <div>
                  <div className="font-black text-black dark:text-white"><LocalizedText id="hPyv89zH2tum" /></div>
                  <div className="text-xs font-bold opacity-60"><LocalizedText id="8QZLb3hCTAZk" /></div>
                </div>
              </div>
              <button className="w-full bg-[#BFFCC6] text-black font-black border-2 border-black py-2 shadow-[2px_2px_0_#000]"><LocalizedText id="EXTYaJUwiOvx" /></button>
            </div>
          </div>
        </div>

        {/* Encargos y producción */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 bg-[#BFFCC6] dark:bg-black border-4 border-black dark:border-white p-8 rounded-3xl shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#BFFCC6]">
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-xl p-5">
              <p className="font-black uppercase border-b-4 border-black dark:border-white pb-3"><LocalizedText id="2MYvZ1hgx8OK" /></p>
              <p className="mt-5 text-3xl font-black"><LocalizedText id="aZ5nHkHcLME_" /></p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-black">
                <span className="border-2 border-black bg-[#FFF5BA] p-2 text-black"><LocalizedText id="ZN7KcC2IOKTF" /></span>
                <span className="border-2 border-black bg-[#FFB5E8] p-2 text-black"><LocalizedText id="qq8PaMYa8YRG" /></span>
                <span className="border-2 border-black bg-[#85E3FF] p-2 text-black"><LocalizedText id="97Pqwc-XGT2p" /></span>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#BFFCC6] text-black shadow-[4px_4px_0_#000]">
              <PackageCheck className="h-8 w-8" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter"><LocalizedText id="w_zrnUHi0onX" /></h2>
            <p className="text-lg font-bold opacity-80">
              <LocalizedText id="VC6y0DN6Wp0l" />
            </p>
            <ul className="space-y-2 font-bold">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> <LocalizedText id="P9BhRaYS9nOr" /></li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> <LocalizedText id="6umtmuPZ1dyc" /></li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> <LocalizedText id="86MPUKFzO_C-" /></li>
            </ul>
            <Link href="/guias/agenda-encargos-con-abono" className="inline-flex font-black uppercase text-[#7C3AED] hover:underline">
              <LocalizedText id="BWkP2tnsea3X" />
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="border-y-4 border-black dark:border-white py-20 bg-white dark:bg-[#111]">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-center mb-16"><LocalizedText id="URlT4L0q7tki" /></h2>
          <div className="grid md:grid-cols-3 gap-8">
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 border-4 border-black dark:border-white rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] bg-white dark:bg-black hover:-translate-y-2 transition-transform">
                <div className={`h-16 w-16 ${m.bg} border-4 border-black flex items-center justify-center rounded-xl mb-6 shadow-[4px_4px_0_#000]`}>
                  <m.icon className="h-8 w-8 text-black" />
                </div>
                <div className="text-5xl font-black uppercase mb-2">{m.value}</div>
                <div className="text-lg font-bold opacity-80">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-bold opacity-60">
            <LocalizedText id="a9HBBXAo2fOH" />
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <h2 className="text-3xl font-black uppercase mb-6"><LocalizedText id="LtEXF-9Jokpx" /></h2>
        <p className="font-bold opacity-80 mb-10 max-w-xl mx-auto">
          <LocalizedText id="brrj9qrVXilr" />
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <button className="bg-[#FFB5E8] text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 transition-all">
              <LocalizedText id="Qx6QrYQs-Z6R" />
            </button>
          </Link>
          <Link href="/contacto">
            <button className="bg-black text-white dark:bg-white dark:text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 transition-all">
              <LocalizedText id="QBmYgp3yqmgG" />
            </button>
          </Link>
        </div>
        <p className="mt-6 text-sm font-bold opacity-60"><LocalizedText id="0XlRQfxgHDRt" /></p>
      </section>
    </LandingLayout>
  );
}
