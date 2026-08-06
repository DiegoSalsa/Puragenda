import { LandingLayout } from "@/components/landing/landing-layout";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Mail, Phone } from "lucide-react";
import { Metadata } from "next";
import { ContactForm } from "@/components/landing/contact-form";
import { absoluteUrl } from "@/lib/site";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("metadataTitle"), description: t("metadataDescription"), alternates: { canonical: absoluteUrl("/contacto") } };
}

export default async function ContactoPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;
  const t = await getTranslations("contact");

  return (
    <LandingLayout user={user} business={business}>
      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center mb-6">
          {t("title")}
        </h1>
        <p className="text-xl font-bold text-center mb-16 opacity-80">
          {t("subtitle")}
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Info */}
          <div className="space-y-6">
            <a href="mailto:contacto@purocode.com" className="block bg-[#BFFCC6] dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#BFFCC6] text-black dark:text-white hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-2">
                <Mail className="h-6 w-6" />
                <h3 className="text-xl font-black uppercase">Email</h3>
              </div>
              <p className="font-bold opacity-80">contacto@purocode.com</p>
            </a>
            
            <a href="https://wa.me/56949255006" target="_blank" rel="noopener noreferrer" className="block bg-[#FFF5BA] dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFF5BA] text-black dark:text-white hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-2">
                <Phone className="h-6 w-6" />
                <h3 className="text-xl font-black uppercase">WhatsApp</h3>
              </div>
              <p className="font-bold opacity-80">+56 9 4925 5006</p>
            </a>
          </div>

          <ContactForm />
        </div>

        {/* SLA and Sales FAQ */}
        <div className="mt-24 border-t-4 border-black dark:border-white pt-16">
          <h2 className="text-3xl font-black uppercase text-center mb-12">{t("commitment")}</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="bg-[#BFFCC6] text-black border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_#000]">
                <h3 className="text-xl font-black uppercase mb-2">{t("responseTimes")}</h3>
                <p className="font-bold opacity-80">{t("responseTimesDescription")}</p>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                <h3 className="text-xl font-black uppercase mb-2">{t("migration")}</h3>
                <p className="font-bold opacity-80">{t("migrationDescription")}</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black uppercase mb-4">{t("commonQuestions")}</h3>
              <div className="space-y-4">
                <div className="border-b-2 border-black dark:border-white/20 pb-4">
                  <h4 className="font-black uppercase mb-1">{t("contractQuestion")}</h4>
                  <p className="text-sm font-bold opacity-80">{t("contractAnswer")}</p>
                </div>
                <div className="border-b-2 border-black dark:border-white/20 pb-4">
                  <h4 className="font-black uppercase mb-1">{t("technicalQuestion")}</h4>
                  <p className="text-sm font-bold opacity-80">{t("technicalAnswer")}</p>
                </div>
                <div className="border-b-2 border-black dark:border-white/20 pb-4">
                  <h4 className="font-black uppercase mb-1">{t("trialQuestion")}</h4>
                  <p className="text-sm font-bold opacity-80">{t("trialAnswer")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
