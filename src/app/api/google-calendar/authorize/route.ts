import { NextRequest, NextResponse } from "next/server";

import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  googleCalendarAppUrl,
  googleCalendarIsConfigured,
} from "@/server/services/google-calendar.service";
import { getGoogleOAuthScopeContext } from "@/server/services/google-calendar-access.service";

function appUrl(request: NextRequest, path: string) {
  return googleCalendarAppUrl(path, request.url);
}

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.redirect(appUrl(request, "/login"));
  const business = await getBusinessForUser(user.id);
  if (!business) {
    return NextResponse.redirect(appUrl(request, "/dashboard/google-calendar?google_error=no_business"));
  }
  if (!googleCalendarIsConfigured()) {
    return NextResponse.redirect(appUrl(request, "/dashboard/google-calendar?google_error=not_configured"));
  }
  const requestedScope = request.nextUrl.searchParams.get("scope") ?? "staff";
  const requestedStaffId = request.nextUrl.searchParams.get("staffId");
  const context = await getGoogleOAuthScopeContext(
    user,
    business,
    requestedScope,
    requestedStaffId,
  );
  if (!context) {
    return NextResponse.redirect(appUrl(request, "/dashboard/google-calendar?google_error=forbidden"));
  }

  const { loginHint, ...scopeContext } = context;
  const state = createGoogleOAuthState({
    userId: user.id,
    businessId: business.id,
    ...scopeContext,
  });
  return NextResponse.redirect(buildGoogleAuthorizationUrl(state, loginHint || user.email));
}
