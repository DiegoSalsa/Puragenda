import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { sendForgotPasswordEmail } from "@/server/email/send";
import { loginLimiter } from "@/server/lib/rate-limit";
import { issuePasswordResetToken } from "@/server/auth/password-reset";

/**
 * POST /api/auth/forgot-password
 * Receives { email } and sends a password reset link.
 * Always returns 200 to prevent email enumeration.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (reuse login limiter — same sensitivity)
    const blocked = loginLimiter.check(request);
    if (blocked) return blocked;

    const body = await request.json();
    const email = body.email?.trim()?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { message: "Si el email existe, recibirás un enlace para restablecer tu contraseña." },
        { status: 200 }
      );
    }

    // Check if user exists (don't reveal if they don't)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = await issuePasswordResetToken(email);

      // Send email (fire and forget)
      sendForgotPasswordEmail(email, token).catch(() => {});
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      { message: "Si el email existe, recibirás un enlace para restablecer tu contraseña." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/forgot-password] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
