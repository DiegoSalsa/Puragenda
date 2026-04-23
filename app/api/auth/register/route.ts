import { registerUser } from "@/backend/services/auth.service";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/backend/auth/session";
import { registerSchema } from "@/backend/validations/auth";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar con Zod
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return Response.json(
        { error: "Errores de validación", details: errors },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    const result = await registerUser({ email, password, name });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 409 }
      );
    }

    const token = createSessionToken({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    });

    const response = NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        user: result.user,
        business: result.business,
      },
      { status: 201 }
    );

    response.cookies.set(
      AUTH_COOKIE_NAME,
      token,
      getSessionCookieOptions()
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
