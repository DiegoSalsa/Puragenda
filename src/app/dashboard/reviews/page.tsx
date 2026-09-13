import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { getReviewOpportunity } from "@/server/services/review-invitation.service";
import { getDashboardReputation, listDashboardReviews, type DashboardReviewFilter } from "@/server/services/reviews.service";
import { ReviewsDashboard } from "./reviews-dashboard";

export const dynamic = "force-dynamic";

const FILTERS: DashboardReviewFilter[] = ["ALL", "PENDING", "PUBLISHED", "PRIVATE", "REPORTED"];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; rating?: string; page?: string }>;
}) {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;
  if (!user || !business) {
    return <div className="py-20 text-center font-bold">Debes iniciar sesión.</div>;
  }
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.REVIEWS_MANAGE))) {
    return <div className="py-20 text-center font-bold">No tienes permiso para gestionar reseñas.</div>;
  }

  const params = await searchParams;
  const filter = FILTERS.includes(params.filter as DashboardReviewFilter)
    ? params.filter as DashboardReviewFilter
    : "ALL";
  const rating = Number(params.rating);
  const page = Number(params.page) || 1;

  const [reputation, list, opportunity] = await Promise.all([
    getDashboardReputation(business.id),
    listDashboardReviews({
      businessId: business.id,
      filter,
      rating: Number.isInteger(rating) ? rating : undefined,
      page,
    }),
    getReviewOpportunity(business.id),
  ]);

  return (
    <ReviewsDashboard
      reputation={reputation}
      filter={filter}
      opportunity={opportunity}
      reviews={list.items.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        visibility: review.visibility,
        status: review.status,
        submittedAt: review.submittedAt.toISOString(),
        publicReviewerName: review.publicReviewerName,
        serviceNameSnapshot: review.serviceNameSnapshot,
        businessReply: review.businessReply,
        appointment: {
          id: review.appointment.id,
          startTime: review.appointment.startTime.toISOString(),
          service: review.appointment.service,
          staff: review.appointment.staff,
        },
      }))}
    />
  );
}
