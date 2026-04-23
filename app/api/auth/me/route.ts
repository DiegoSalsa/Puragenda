import { getApiSessionUser } from "@/backend/auth/user-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
