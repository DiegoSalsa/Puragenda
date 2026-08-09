"use server";

import { prisma } from "@/server/db/prisma";
import { sendForgotPasswordEmail } from "@/server/email/send";
import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "@/core/constants";
import {
  findPasswordResetToken,
  issuePasswordResetToken,
} from "@/server/auth/password-reset";

const TOKEN_EXPIRY_HOURS = 1;

/**
 * Request a password reset — generates a token and sends email.
 * Always returns success to avoid leaking whether the email exists.
 */
export async function forgotPasswordAction(email: string) {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { error: "Ingresa un email válido" };
  }

  try {
    // Check if user exists (silently)
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });

    if (user) {
      const token = await issuePasswordResetToken(
        trimmedEmail,
        TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
      );

      // Send email (fire and forget)
      await sendForgotPasswordEmail(trimmedEmail, token);
    }

    // Always return success to prevent email enumeration
    return { success: true };
  } catch (err) {
    console.error("[Auth] Error in forgotPasswordAction:", err);
    return { error: "Error al procesar la solicitud. Intenta de nuevo." };
  }
}

/**
 * Reset password using a valid, non-expired token.
 */
export async function resetPasswordAction(token: string, newPassword: string) {
  if (!token) {
    return { error: "Token inválido" };
  }

  if (!newPassword || newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  if (newPassword.length > 128) {
    return { error: "La contraseña no debe exceder 128 caracteres" };
  }

  try {
    // Find the token
    const resetToken = await findPasswordResetToken(token);

    if (!resetToken) {
      return { error: "El enlace es inválido o ya fue utilizado" };
    }

    // Check expiration
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return { error: "El enlace ha expirado. Solicita uno nuevo." };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password and delete token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword, tokenVersion: { increment: 1 } },
      }),
      prisma.passwordResetToken.delete({ where: { id: resetToken.id } }),
    ]);

    return { success: true };
  } catch (err) {
    console.error("[Auth] Error in resetPasswordAction:", err);
    return { error: "Error al restablecer la contraseña. Intenta de nuevo." };
  }
}
