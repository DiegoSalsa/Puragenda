import { registerUser } from "@/server/services/auth.service";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/server/auth/session";
import { registerSchema } from "@/server/validations/auth";
import { NextRequest, NextResponse } from "next/server";
import { registerLimiter } from "@/server/lib/rate-limit";
import { LOCALE_COOKIE, resolveInitialLocale } from "@/i18n/config";


export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const blocked = registerLimiter.check(request);
    if (blocked) return blocked;

    const body = await request.json();

    // Honeypot: if a hidden field is filled, it's a bot
    if (body.website) {
      // Silently reject — bots think registration succeeded
      return NextResponse.json(
        { message: "Usuario registrado exitosamente" },
        { status: 201 }
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return NextResponse.json(
        { error: "Errores de validación", details: errors },
        { status: 400 }
      );
    }

    // Capture IP for anti-fraud
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    const { email, password, name, businessName, countryCode, timezone, currencyCode, referralCode, planIntent, extraStaffCount } = parsed.data;
    const locale = resolveInitialLocale(request.cookies.get(LOCALE_COOKIE)?.value);
    const result = await registerUser({ email, password, name, businessName, countryCode, timezone, currencyCode, ip, referralCode, planIntent, extraStaffCount, locale });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    const token = createSessionToken({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      isSuperAdmin: result.user.isSuperAdmin,
    });

    const response = NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        user: result.user,
        business: result.business,
      },
      { status: 201 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("[route] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
