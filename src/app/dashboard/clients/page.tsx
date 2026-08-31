import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { ClientsTable } from "./clients-table";
import { getBusinessForUser } from "@/server/services/business.service";
import { getClientListStats, listClients } from "@/server/services/client.service";
import {
  CLIENT_LIST_DEFAULT_LIMIT,
  CLIENT_LIST_DEFAULT_PAGE,
  buildClientListPath,
  parseClientListQuery,
} from "@/server/validations/pagination";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { getCountryConfig } from "@/core/countries";
import { getTranslations } from "next-intl/server";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[]; search?: string | string[] }>;
}) {
  const t = await getTranslations("dashboard.clients");
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  const biz = await getBusinessForUser(user.id);
  if (!biz) redirect("/dashboard/settings");
  if (!(await hasBusinessPermission(user, biz, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">{t("permissionDenied")}</div>;
  }

  const business = await prisma.business.findUnique({
    where: { id: biz.id },
  });

  if (!business) redirect("/dashboard/settings");

  const parsed = parseClientListQuery(await searchParams);
  const query = parsed.success
    ? parsed.data
    : { page: CLIENT_LIST_DEFAULT_PAGE, limit: CLIENT_LIST_DEFAULT_LIMIT, search: "" };

  const [list, stats] = await Promise.all([
    listClients(business.id, query),
    getClientListStats(business.id),
  ]);

  if (query.page > 1 && query.page > list.pagination.totalPages) {
    redirect(buildClientListPath(Math.max(1, list.pagination.totalPages), query.search, query.limit));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("registered", { count: stats.totalClients })}</p>
      </div>
      <ClientsTable
        clients={list.data}
        pagination={list.pagination}
        search={query.search}
        stats={stats}
        currencyCode={business.currencyCode}
        taxIdLabel={getCountryConfig(business.countryCode).taxIdLabel}
        taxIdPlaceholder={getCountryConfig(business.countryCode).taxIdPlaceholder}
      />

      <PageTutorial
        tutorialKey="clientes_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: t("tutorial.databaseTitle"),
              description: t("tutorial.databaseDescription"),
            }
          },
          {
            element: "table",
            popover: {
              title: t("tutorial.metricsTitle"),
              description: t("tutorial.metricsDescription"),
              side: "top",
              align: "start"
            }
          },
          {
            element: ".space-y-6 > div:last-child",
            popover: {
              title: t("tutorial.notesTitle"),
              description: t("tutorial.notesDescription"),
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
