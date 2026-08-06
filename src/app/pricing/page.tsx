import Link from "next/link";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { PricingCards } from "@/components/pricing-cards";
import { LandingLayout } from "@/components/landing/landing-layout";
import { STAFF_LIMITS } from "@/core/constants";
import { absoluteUrl } from "@/lib/site";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("pricing");
  return {
    title: t("pageTitle"),
    description: t("pageSubtitle"),
    alternates: { canonical: absoluteUrl("/pricing") },
  };
}

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const compare = await getTranslations("pricingComparison");
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">{t("pageTitle")}</h1>
        <p className="mx-auto mb-4 mt-4 max-w-xl text-balance text-center font-bold text-black/70 dark:text-gray-400">{t("pageSubtitle")}</p>
        <PricingCards mode="landing" />
      </section>

      {/* Comparison Table */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="mb-12 text-center text-2xl font-black uppercase tracking-tighter sm:text-3xl">{compare("title")}</h2>
        <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-2xl overflow-hidden shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF]">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-[#FFF5BA] dark:bg-black border-b-4 border-black dark:border-white text-black dark:text-white">
                <th className="p-4 font-black uppercase border-r-4 border-black dark:border-white">{compare("feature")}</th>
                <th className="p-4 font-black uppercase border-r-4 border-black dark:border-white text-center">{compare("individual")}</th>
                <th className="p-4 font-black uppercase text-center">{compare("team")}</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("unlimitedBookings")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center">{compare("unlimited")}</td>
                <td className="p-4 text-center">{compare("unlimited")}</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("bookingWidget")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("adminPanel")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("whiteLabel")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("winBack")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("includedStaff")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center">{STAFF_LIMITS.INDIVIDUAL}</td>
                <td className="p-4 text-center">{STAFF_LIMITS.EQUIPO}</td>
              </tr>
              <tr>
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("roles")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-red-500">✗</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>
      



      {user && (
        <div className="text-center pb-12">
          <Link href="/dashboard" className="inline-block border-4 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_#FFFFFF] hover:translate-y-1 transition-all">
            ← {compare("backDashboard")}
          </Link>
        </div>
      )}
    </LandingLayout>
  );
}
