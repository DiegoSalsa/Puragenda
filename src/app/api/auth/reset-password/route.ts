import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "@/core/constants";
import { loginLimiter } from "@/server/lib/rate-limit";
import { findPasswordResetToken } from "@/server/auth/password-reset";

/**
 * POST /api/auth/reset-password
 * Receives { token, password } and resets the user's password.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const blocked = loginLimiter.check(request);
    if (blocked) return blocked;

    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "La contraseña no debe exceder 128 caracteres." },
        { status: 400 }
      );
    }

    // Find the token
    const resetToken = await findPasswordResetToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { error: "El enlace es inválido o ya fue utilizado." },
        { status: 400 }
      );
    }

    // Check expiration
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json(
        { error: "El enlace ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, tokenVersion: { increment: 1 } },
      }),
      // Delete all tokens for this email (cleanup)
      prisma.passwordResetToken.deleteMany({
        where: { email: resetToken.email },
      }),
    ]);

    console.log(`[auth/reset-password] Password reset for ${resetToken.email}`);

    return NextResponse.json(
      { message: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/reset-password] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
