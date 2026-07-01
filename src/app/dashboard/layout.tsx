import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PaymentWall } from "@/components/dashboard/payment-wall";
import { DashboardTutorial } from "@/components/dashboard/tutorial";
import { ChangelogPopup } from "@/components/dashboard/changelog-popup";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  const business = await getBusinessForUser(user.id);

  // Check subscription status — block access if INACTIVE (pending payment)
  if (business && user.role !== "SUPERADMIN") {
    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    if (subscription?.status === "INACTIVE") {
      return (
        <PaymentWall 
          userEmail={user.email} 
          userName={user.name}
          businessId={business.id} 
          businessName={business.name}
          plan={subscription.plan} 
        />
      );
    }
  }

  const changelogSeenVersion = (await cookies()).get("puragenda_changelog_seen")?.value;

  return (
    <div className="flex fixed inset-0 overflow-hidden bg-background">
      <DashboardSidebar
        userName={user.name}
        widgetSlug={business?.slug}
        userRole={user.role}
      />
      <main id="tutorial-main" className="flex-1 overflow-auto">
        <div className="px-4 pt-[72px] pb-6 sm:p-8 md:pt-8">{children}</div>
      </main>
      <DashboardTutorial userEmail={user.email} />
      <ChangelogPopup
        seenVersion={changelogSeenVersion}
        isDemoAccount={
          business?.slug?.toLowerCase().includes("esteticabella") ||
          business?.slug?.toLowerCase().includes("estetica-bella") ||
          user.email.toLowerCase().includes("esteticabella") ||
          user.email.toLowerCase().includes("diego")
        }
      />
    </div>
  );
}
