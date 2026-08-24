"use client";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, CalendarClock, Scissors, Sparkles, Stethoscope, Users, Palette, Shield, CreditCard } from "@/components/icons/hover-icons";
import { Navbar } from "@/components/landing/navbar";
import { WordCarousel } from "@/components/landing/word-carousel";
import { Theme70s } from "@/components/landing/Theme70s";
import type { LandingIdentityProps } from "@/components/landing/types";
import { useTranslations } from "next-intl";
const Footer = dynamic(() => import("@/components/landing/footer").then((m) => m.Footer), { ssr: true });

const neoVars: React.CSSProperties & Record<string, string> = {
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

export function ThemeNeoBrutalism({ user, business }: LandingIdentityProps) {
  const legacy = useTranslations("legacy");
  const t = useTranslations("landing");
  const [easterEggCount, setEasterEggCount] = useState(0);
  const [show70s, setShow70s] = useState(false);

  if (show70s) {
    return <Theme70s user={user} business={business} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#FFFAEB] text-black dark:bg-[#111111] dark:text-white font-sans selection:bg-[#B28DFF] dark:selection:text-black transition-colors duration-300" style={neoVars}>
      <Navbar user={user} business={business} />
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative mx-auto flex min-h-[85vh] max-w-6xl flex-col items-center justify-center px-6 pt-32 md:pt-40 lg:pt-48 pb-24 text-center">
          {/* Decorative Elements */}
          <div 
            className="absolute left-10 top-48 md:top-56 hidden lg:block animate-[bounce_5s_infinite] cursor-pointer select-none z-50"
            onClick={() => {
              try {
                const browserWindow = window as Window & typeof globalThis & {
                  webkitAudioContext?: typeof AudioContext;
                };
                const AudioContextConstructor = window.AudioContext || browserWindow.webkitAudioContext;
                if (!AudioContextConstructor) return;
                const audioCtx = new AudioContextConstructor();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(400 + (easterEggCount * 40), audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
              } catch {
                // Ignore audio errors
              }

              if (easterEggCount >= 19) {
                setShow70s(true);
              } else {
                setEasterEggCount(prev => prev + 1);
              }
            }}
          >
            <div className="w-16 h-16 bg-[#FFB5E8] border-4 border-black dark:border-white rounded-full shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF5BA]"></div>
          </div>
          <div className="absolute right-12 top-32 hidden lg:block animate-[spin_10s_linear_infinite]">
            <Sparkles className="w-20 h-20 text-[#B28DFF] dark:text-[#85E3FF] drop-shadow-[4px_4px_0_#000] dark:drop-shadow-[4px_4px_0_#FFF]" />
          </div>
          <div className="absolute left-20 bottom-32 hidden lg:block animate-[pulse_4s_infinite]">
            <div className="w-24 h-10 bg-[#BFFCC6] border-4 border-black dark:border-white rounded-full shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] -rotate-12"></div>
          </div>
          <div className="absolute right-24 bottom-40 hidden lg:block animate-[bounce_6s_infinite_reverse]">
            <div className="w-14 h-14 bg-[#FFF5BA] border-4 border-black dark:border-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFB5E8] rotate-45"></div>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center justify-center">
            {/* Differentiator tags */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="bg-[#BFFCC6] border-[3px] border-black text-black text-sm font-black uppercase px-4 py-1.5 shadow-[3px_3px_0_#000] -rotate-1 tracking-wide">✓ {t("noCommissions")}</span>
              <span className="bg-[#FFF5BA] border-[3px] border-black text-black text-sm font-black uppercase px-4 py-1.5 shadow-[3px_3px_0_#000] rotate-1 tracking-wide">✓ {t("freeTrial")}</span>
              <span className="bg-[#FFB5E8] border-[3px] border-black text-black text-sm font-black uppercase px-4 py-1.5 shadow-[3px_3px_0_#000] -rotate-1 tracking-wide">✓ {t("noContract")}</span>
            </div>
            <h1 className="sr-only">{t("srTitle")}</h1>
            <div aria-hidden="true" className="text-5xl font-black uppercase tracking-tighter sm:text-8xl lg:text-9xl">
              <span className="block drop-shadow-[4px_4px_0_rgba(0,0,0,1)] dark:drop-shadow-[4px_4px_0_#FFFFFF]">{t("titleLine1")}</span>
              <span className="block drop-shadow-[4px_4px_0_rgba(0,0,0,1)] dark:drop-shadow-[4px_4px_0_#FFFFFF]">{t("titleLine2")}</span>
              <span className="mt-4 block inline-block max-w-[calc(100vw-2.5rem)] border-[6px] border-black dark:border-white bg-[#85E3FF] dark:bg-[#7C3AED] px-3 py-2 text-[#7C3AED] dark:text-[#85E3FF] shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF] transform -rotate-2 sm:max-w-none sm:px-6">
                <WordCarousel className="text-[clamp(2rem,11.5vw,3rem)] sm:text-8xl lg:text-9xl" words={t("carousel").split("|")} />
              </span>
            </div>

            {/* CTAs and badges */}
            <div className="mt-12 flex flex-col items-center gap-8 z-20">
              <p className="max-w-2xl text-xl font-bold sm:text-2xl dark:text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.1)]">
                {t("subtitle")}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto justify-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <button className="w-full bg-[#FFB5E8] text-black border-4 border-black dark:border-white px-8 py-5 text-xl font-black uppercase shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-none transition-all flex justify-center items-center gap-3">
                    {t("startFree")} <ArrowRight className="h-6 w-6 stroke-[3px]" />
                  </button>
                </Link>
                <a href="/api/auth/demo" className="w-full sm:w-auto group relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#BFFCC6] border-2 border-black text-black text-xs font-black uppercase px-2 py-0.5 shadow-[2px_2px_0_#000] whitespace-nowrap z-10">
                    <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse inline-block" />
                    {t("live")}
                  </span>
                  <button className="w-full bg-[#85E3FF] text-black border-4 border-black dark:border-white px-8 py-5 text-xl font-black uppercase shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-none transition-all flex justify-center items-center gap-2">
                    ▶ {t("viewDemo")}
                  </button>
                </a>
              </div>

              <p className="text-base font-bold dark:text-gray-300">
                {t("trialNote")}
              </p>
              
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-[#FFF5BA] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
                  <Scissors className="h-5 w-5" /> {t("hairSalons")}
                </div>
                <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-[#85E3FF] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
                  <Sparkles className="h-5 w-5" /> {t("beauty")}
                </div>
                <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-[#FFB5E8] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
                  <Stethoscope className="h-5 w-5" /> {t("clinics")}
                </div>
              </div>


            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE / MOCKUPS */}
        <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 py-16 space-y-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center">
              {t("everythingTitle")}
            </h2>
          </div>

          {/* Main showcase: Widget + Dashboard */}
          <div className="grid gap-6 lg:grid-cols-5 relative">
            
            {/* Widget Preview - col 1-2 */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border-4 border-black dark:border-white bg-[#FFF5BA] dark:bg-black p-6 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFF5BA] transition-transform hover:-translate-y-1">
              <div className="relative flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black dark:text-white mb-6">
                <div className="h-3 w-3 rounded-full border-2 border-black dark:border-white bg-[#FFB5E8] animate-pulse" />
                {t("customerView")}
              </div>
              
              {/* Fake widget mockup */}
              <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-[#111111] p-5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-black/60 dark:text-white/60">{t("onlineBooking")}</p>
                    <p className="text-base font-black"><LocalizedText id="PSudvDdmZJlG" /></p>
                  </div>
                  <span className="rounded-full border-2 border-black bg-[#FFB5E8] px-3 py-1 text-[10px] font-black text-black">{t("stepByStep")}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="min-w-0 rounded-full border-2 border-black bg-[#FFB5E8] px-1 py-1 text-center text-[9px] font-black text-black shadow-[2px_2px_0_#000] sm:px-2 sm:text-[10px]">{t("service")}</div>
                  <div className="min-w-0 rounded-full border-2 border-black bg-[#FFB5E8] px-1 py-1 text-center text-[9px] font-black text-black shadow-[2px_2px_0_#000] sm:px-2 sm:text-[10px]">{t("date")}</div>
                  <div className="min-w-0 rounded-full border-2 border-black dark:border-white px-1 py-1 text-center text-[9px] font-black dark:text-white sm:px-2 sm:text-[10px]">{t("details")}</div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="rounded-xl border-2 border-black bg-[#FFB5E8] p-3 shadow-[2px_2px_0_#000]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-black">{t("haircut")}</p>
                        <div className="mt-1 flex gap-2 text-[11px] font-bold text-black/80">
                          <span><LocalizedText id="9p-ikd4TTjzF" /></span>
                          <span>$15.000</span>
                        </div>
                      </div>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-white text-black font-black text-[10px]">✓</div>
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-black dark:border-white bg-gray-100 dark:bg-gray-800 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black dark:text-white">{t("gelManicure")}</p>
                        <div className="mt-1 flex gap-2 text-[11px] font-bold text-black/60 dark:text-white/60">
                          <span><LocalizedText id="tj8fSPedw8Ax" /></span>
                          <span>$25.000</span>
                        </div>
                      </div>
                      <div className="h-5 w-5 rounded-full border-2 border-black dark:border-white bg-white dark:bg-transparent" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {["Lun", "Mar", legacy("wk1GRWMFhb2b"), "Jue", "Vie"].map((d, i) => (
                    <div key={d} className={`rounded-lg border-2 border-black dark:border-white px-1 py-1.5 text-center text-[10px] ${i === 1 ? "bg-[#FFB5E8] shadow-[2px_2px_0_#000] text-black" : "dark:text-white"}`}>
                      <p className={`font-bold ${i === 1 ? "text-black" : "text-black/60 dark:text-white/60"}`}>{d}</p>
                      <p className="text-sm font-black">{14 + i}</p>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {["10:00", "10:30", "11:00", "11:30"].map((t, i) => (
                    <div key={t} className={`rounded-full border-2 px-2 py-1 text-center text-[10px] font-black ${i === 2 ? "border-black bg-[#FFB5E8] text-black shadow-[2px_2px_0_#000]" : "border-black dark:border-white text-black/60 dark:text-white/60"}`}>
                      {t}
                    </div>
                  ))}
                </div>
                
                <div className="border-t-2 border-black/10 dark:border-white/20 pt-3 text-center text-[9px] font-bold text-black/50 dark:text-white/50">
                  <LocalizedText id="rBGEuo8AmdZu" />
                </div>
              </div>
            </div>

            {/* Dashboard Preview - col 3-5 */}
            <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border-4 border-black dark:border-white bg-[#B28DFF] dark:bg-black p-6 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#B28DFF] transition-transform hover:-translate-y-1">
              <div className="relative flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black dark:text-white mb-6">
                <div className="h-3 w-3 rounded-full border-2 border-black dark:border-white bg-[#85E3FF] animate-pulse" />
                {t("adminPreview")}
              </div>
              
              {/* Fake dashboard */}
              <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-[#111111] overflow-hidden shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
                {/* Top bar */}
                <div className="flex items-center gap-3 border-b-4 border-black dark:border-white px-4 py-3 bg-[#FFFAEB] dark:bg-[#222]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black dark:border-white bg-[#7C3AED]">
                    <CalendarClock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-black">
                    Puragenda
                  </span>
                  <div className="ml-auto flex gap-2">
                    {[t("appointments"), t("team"), t("services")].map((label, index) => (
                      <span key={label} className={`rounded-md border-2 border-black dark:border-white px-2 py-1 text-[10px] font-black ${index === 0 ? "bg-[#FFF5BA] text-black shadow-[2px_2px_0_#000]" : "dark:text-white"}`}>{label}</span>
                    ))}
                  </div>
                </div>
                
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: t("today"), value: "8", sub: t("appointments").toLowerCase(), bg: "bg-[#85E3FF]" },
                    { label: "Semana", value: "34", sub: "reservas", bg: "bg-[#FFF5BA]" },
                    { label: "Check-in", value: "92%", sub: "asistencia", bg: "bg-[#FFB5E8]" },
                  ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl border-2 border-black dark:border-white px-3 py-2 ${stat.bg} shadow-[2px_2px_0_#000]`}>
                      <p className="text-[10px] font-black text-black/70">{stat.label}</p>
                      <p className="text-2xl font-black text-black leading-tight">{stat.value}</p>
                      <p className="text-[10px] font-bold text-black/60">{stat.sub}</p>
                    </div>
                  ))}
                </div>
                
                {/* Calendar/Appointments list */}
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-[11px] font-black uppercase text-black/50 dark:text-white/50 mb-2">{t("upcoming")}</p>
                  {[
                    { name: legacy("CQ_WJP7-7ahj"), service: legacy("Yzf6yfxwkh4U"), time: "10:00", staff: "Diego S.", status: "confirmed" },
                    { name: legacy("hPyv89zH2tum"), service: "Desarrollo Landing", time: "11:00", staff: "Diego S.", status: "pending" },
                    { name: "Ana Torres", service: legacy("Yzf6yfxwkh4U"), time: "15:00", staff: "Camila R.", status: "checked" },
                  ].map((apt) => (
                    <div key={apt.name} className="flex items-center justify-between rounded-xl border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#FFF5BA] text-[11px] font-black text-black shadow-[2px_2px_0_#000]">
                          {apt.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[11px] font-black dark:text-white">{apt.name}</p>
                          <p className="text-[10px] font-bold text-black/60 dark:text-white/60">{apt.service} · {apt.staff}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black dark:text-white">{apt.time}</span>
                        <div className={`h-3 w-3 rounded-full border-2 border-black ${apt.status === "confirmed" ? "bg-[#BFFCC6]" : apt.status === "pending" ? "bg-[#FFF5BA]" : "bg-[#85E3FF]"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary showcase: feature cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 dark:text-white" />
                <p className="text-base font-black uppercase dark:text-white">{t("customization")}</p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">{t("customizationText")}</p>
              <div className="flex gap-2">
                {["#7C3AED", "#FFB5E8", "#FFF5BA", "#BFFCC6", "#85E3FF"].map((c) => (
                  <div key={c} className="h-6 w-6 rounded-md border-2 border-black shadow-[2px_2px_0_#000]" style={{ background: c }} />
                ))}
              </div>
            </div>
            
            <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 dark:text-white" />
                <p className="text-base font-black uppercase dark:text-white">{t("multiProfessional")}</p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">{t("multiProfessionalText")}</p>
              <div className="flex -space-x-2">
                {["D", "C", "M", "V"].map((letter, i) => (
                  <div key={letter} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black text-[10px] font-black text-black shadow-[2px_2px_0_#000]" style={{ background: ["#85E3FF", "#FFB5E8", "#FFF5BA", "#BFFCC6"][i], zIndex: 4 - i }}>
                    {letter}
                  </div>
                ))}
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-[10px] font-black text-black shadow-[2px_2px_0_#000]">+3</div>
              </div>
            </div>
            
            <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 dark:text-white" />
                <p className="text-base font-black uppercase dark:text-white"><LocalizedText id="a2yoi_zh6rND" /></p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">{t("collisionProtectionText")}</p>
              <div className="space-y-2 text-[10px] font-black">
                <div className="flex items-center gap-2 rounded-lg border-2 border-black bg-[#BFFCC6] px-2.5 py-1.5 shadow-[2px_2px_0_#000]">
                  <div className="h-2 w-2 rounded-full border border-black bg-white" />
                  <span className="text-black">10:00 - 11:00</span>
                  <span className="ml-auto text-black/60"><LocalizedText id="VlM5vE0z1ygX" /></span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border-2 border-black bg-gray-200 px-2.5 py-1.5 opacity-60">
                  <div className="h-2 w-2 rounded-full border border-black bg-black" />
                  <span className="text-black line-through">10:30 - 11:30</span>
                  <span className="ml-auto text-black/60"><LocalizedText id="D_8czenqI3pC" /></span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-4 border-[#009EE3] bg-[#009EE3]/10 dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#009EE3] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#009EE3]" />
                <p className="text-base font-black uppercase text-[#009EE3]">{t("onlineDeposits")}</p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">{t("onlineDepositsText")}</p>
              {/* MercadoPago official logo */}
              <div className="flex items-center justify-center rounded-lg border-2 border-[#009EE3] bg-white px-5 py-3.5 shadow-[2px_2px_0_#009EE3]">
                <img src="/logos/mercadopago.svg" alt="Mercado Pago" className="h-16 w-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* Compact Google Calendar disclosure */}
        <section id="google-calendar" className="mx-auto w-full max-w-6xl scroll-mt-32 px-6 pb-10">
          <div className="flex flex-col gap-3 rounded-xl border-2 border-black/40 bg-white/50 px-4 py-3 text-black shadow-[3px_3px_0_rgba(0,0,0,0.35)] dark:border-white/40 dark:bg-white/5 dark:text-white sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white text-[#4285F4] dark:border-white">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black uppercase"><LocalizedText id="vcni4knTgNJJ" /></h2>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-black/65 dark:text-white/65">
                  {t("calendarSyncText")}
                </p>
              </div>
            </div>
            <Link
              href="/politica-de-privacidad#google-calendar"
              className="shrink-0 text-xs font-bold text-[#1A73E8] underline underline-offset-4 dark:text-[#85E3FF] sm:ml-auto"
            >
              <LocalizedText id="FtS0eyHNOtQA" />
            </Link>
          </div>
        </section>

        {/* Link to see all features */}
        <section className="flex justify-center pb-16">
          <Link href="/caracteristicas">
             <button className="bg-transparent text-black dark:text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all">
                <LocalizedText id="Zef1fEdWSEAC" />
             </button>
          </Link>
        </section>

        {/* TESTIMONIALS */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl"><LocalizedText id="XbEgTlbh1dKU" /></h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 - amarillo, rotada levemente */}
            <div className="rounded-2xl border-4 border-black bg-[#FFF5BA] dark:bg-black dark:border-white p-7 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFF5BA] flex flex-col gap-4 rotate-[-0.8deg]">
              <span className="text-4xl font-black text-black/20 leading-none select-none"><LocalizedText id="wtzcjbLNrVZ_" /></span>
              <p className="text-base font-bold text-black dark:text-white leading-relaxed -mt-4">{t("testimonialOne")}</p>
              <div className="flex items-center gap-3 mt-auto pt-4 border-t-2 border-black/20 dark:border-white/20">
                <div className="h-11 w-11 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] bg-[#FFB5E8] flex items-center justify-center text-lg font-black text-black shrink-0">V</div>
                <div>
                  <p className="text-sm font-black text-black dark:text-white"><LocalizedText id="Hle8mLHoThST" /></p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60"><LocalizedText id="v8gaH59R-d6E" /></p>
                </div>
              </div>
            </div>
            {/* Card 2 - verde, un poco mas grande visualmente */}
            <div className="rounded-2xl border-4 border-black bg-[#BFFCC6] dark:bg-black dark:border-white p-7 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#BFFCC6] flex flex-col gap-4 md:-translate-y-3">
              <span className="text-4xl font-black text-black/20 leading-none select-none"><LocalizedText id="wtzcjbLNrVZ_" /></span>
              <p className="text-base font-bold text-black dark:text-white leading-relaxed -mt-4">{t("testimonialTwo")}</p>
              <div className="flex items-center gap-3 mt-auto pt-4 border-t-2 border-black/20 dark:border-white/20">
                <div className="h-11 w-11 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] bg-[#85E3FF] flex items-center justify-center text-lg font-black text-black shrink-0">M</div>
                <div>
                  <p className="text-sm font-black text-black dark:text-white"><LocalizedText id="D8s4ptaGQnCI" /></p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">{t("clinicType")}</p>
                </div>
              </div>
            </div>
            {/* Card 3 - cyan, rotada al otro lado */}
            <div className="rounded-2xl border-4 border-black bg-[#85E3FF] dark:bg-black dark:border-white p-7 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#85E3FF] flex flex-col gap-4 rotate-[0.8deg]">
              <span className="text-4xl font-black text-black/20 leading-none select-none"><LocalizedText id="wtzcjbLNrVZ_" /></span>
              <p className="text-base font-bold text-black dark:text-white leading-relaxed -mt-4">{t("testimonialThree")}</p>
              <div className="flex items-center gap-3 mt-auto pt-4 border-t-2 border-black/20 dark:border-white/20">
                <div className="h-11 w-11 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] bg-[#B28DFF] flex items-center justify-center text-lg font-black text-black shrink-0">C</div>
                <div>
                  <p className="text-sm font-black text-black dark:text-white"><LocalizedText id="LCmtJSuhpp_c" /></p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">{t("salonType")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="border-t-4 border-black dark:border-white py-20 bg-[#85E3FF] dark:bg-[#B28DFF] dark:text-black">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">{t("readyTitle")}</h2>
            <p className="max-w-xl font-bold text-black/70">{t("readyText")}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/pricing">
                <button className="bg-black text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,0.3)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all flex items-center gap-2">
                  {t("startFree")} <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <a href="/api/auth/demo">
                <button className="bg-white text-black border-4 border-black px-8 py-4 font-black uppercase text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_#000000] hover:bg-gray-100 transition-colors">
                  {t("viewDemo")}
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
