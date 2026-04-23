import { verifyCredentials } from "@/backend/services/auth.service";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/backend/auth/session";
import { loginSchema } from "@/backend/validations/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message);
      return NextResponse.json(
        { error: "Errores de validacion", details: errors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await verifyCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { error: "Email o contrasena incorrectos" },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: "Login exitoso",
        user,
      },
      { status: 200 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    return response;
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
