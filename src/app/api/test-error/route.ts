import { NextResponse } from "next/server";
import { logCriticalError } from "@/server/lib/error-logger";

export async function GET() {
  try {
    // Simulamos que la API de pagos explotó
    throw new Error("Conexión con MercadoPago rechazada (Simulación)");
  } catch (error: any) {
    await logCriticalError({
      source: "api/test-error",
      message: error.message,
      stack: error.stack,
      userId: "test_user_id_123",
      details: {
        method: "GET",
        endpoint: "/api/test-error",
        action: "Testing Discord Webhooks"
      }
    });

    return NextResponse.json(
      { error: "Error simulado y reportado a Discord." },
      { status: 500 }
    );
  }
}