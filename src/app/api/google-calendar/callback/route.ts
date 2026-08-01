import { NextRequest, NextResponse } from "next/server";

import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getGoogleOAuthScopeContext } from "@/server/services/google-calendar-access.service";
import {
  exchangeGoogleAuthorizationCode,
  getGoogleAccountEmail,
  googleCalendarAppUrl,
  saveGoogleCalendarConnection,
  verifyGoogleOAuthState,
} from "@/server/services/google-calendar.service";

function calendarRedirect(request: NextRequest, params: Record<string, string>) {
  const url = googleCalendarAppUrl("/dashboard/google-calendar", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) return calendarRedirect(request, { google_error: error === "access_denied" ? "denied" : "oauth" });

  const code = request.nextUrl.searchParams.get("code");
  const stateValue = request.nextUrl.searchParams.get("state");
  const state = stateValue ? verifyGoogleOAuthState(stateValue) : null;
  const user = await getApiSessionUser(request);
  if (!code || !state || !user || user.id !== state.userId) {
    return calendarRedirect(request, { google_error: "invalid_state" });
  }

  const business = await getBusinessForUser(user.id);
  const currentScope = business
    ? await getGoogleOAuthScopeContext(
        user,
        business,
        state.scope.toLowerCase(),
        state.staffId,
      )
    : null;
  if (
    !business ||
    business.id !== state.businessId ||
    !currentScope ||
    currentScope.scopeKey !== state.scopeKey ||
    currentScope.staffId !== state.staffId
  ) {
    return calendarRedirect(request, { google_error: "forbidden" });
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code);
    const googleEmail = await getGoogleAccountEmail(tokens.access_token);
    await saveGoogleCalendarConnection({ state, tokens, googleEmail });
    return calendarRedirect(request, {
      google_connected: "true",
      scope: state.scope.toLowerCase(),
    });
  } catch (error) {
    console.error("[google-calendar/callback] OAuth failed", {
      userId: user.id,
      businessId: state.businessId,
      message: error instanceof Error ? error.message : String(error),
    });
    return calendarRedirect(request, { google_error: "token_exchange" });
  }
}
