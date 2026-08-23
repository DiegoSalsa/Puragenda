import { NextRequest } from "next/server";
import {
  getAppleWalletPassBufferForRegistration,
  getAppleWalletPassForRegistration,
  getAppleWalletPassTypeIdentifier,
} from "@/server/services/loyalty-wallet.service";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appleAuthenticationToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const match = /^ApplePass\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

function isExpectedPassType(passTypeIdentifier: string) {
  return passTypeIdentifier === getAppleWalletPassTypeIdentifier();
}

function noStore(response: Response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function registerPass(request: NextRequest, path: string[]) {
  const [, deviceLibraryIdentifier, , passTypeIdentifier, serialNumber] = path;
  if (!deviceLibraryIdentifier || !passTypeIdentifier || !serialNumber || !isExpectedPassType(passTypeIdentifier)) {
    return new Response(null, { status: 404 });
  }
  const authenticationToken = appleAuthenticationToken(request);
  if (!authenticationToken) return new Response(null, { status: 401 });

  const pass = await getAppleWalletPassForRegistration(serialNumber, authenticationToken);
  if (!pass) return new Response(null, { status: 401 });

  const body = await request.json().catch(() => null) as { pushToken?: unknown } | null;
  const pushToken = typeof body?.pushToken === "string" ? body.pushToken.trim() : "";
  if (!pushToken || pushToken.length > 512 || deviceLibraryIdentifier.length > 255) {
    return new Response(null, { status: 400 });
  }

  const existing = await prisma.appleWalletPassRegistration.findUnique({
    where: {
      loyaltyWalletPassId_deviceLibraryIdentifier: {
        loyaltyWalletPassId: pass.walletPass.id,
        deviceLibraryIdentifier,
      },
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.appleWalletDevice.upsert({
      where: { deviceLibraryIdentifier },
      create: { deviceLibraryIdentifier, pushToken },
      update: { pushToken },
    }),
    prisma.appleWalletPassRegistration.upsert({
      where: {
        loyaltyWalletPassId_deviceLibraryIdentifier: {
          loyaltyWalletPassId: pass.walletPass.id,
          deviceLibraryIdentifier,
        },
      },
      create: { loyaltyWalletPassId: pass.walletPass.id, deviceLibraryIdentifier },
      update: {},
    }),
  ]);

  return new Response(null, { status: existing ? 200 : 201 });
}

async function unregisterPass(request: NextRequest, path: string[]) {
  const [, deviceLibraryIdentifier, , passTypeIdentifier, serialNumber] = path;
  if (!deviceLibraryIdentifier || !passTypeIdentifier || !serialNumber || !isExpectedPassType(passTypeIdentifier)) {
    return new Response(null, { status: 404 });
  }
  const authenticationToken = appleAuthenticationToken(request);
  if (!authenticationToken) return new Response(null, { status: 401 });

  const pass = await getAppleWalletPassForRegistration(serialNumber, authenticationToken);
  if (!pass) return new Response(null, { status: 401 });

  await prisma.$transaction(async (tx) => {
    await tx.appleWalletPassRegistration.deleteMany({
      where: { loyaltyWalletPassId: pass.walletPass.id, deviceLibraryIdentifier },
    });
    const remaining = await tx.appleWalletPassRegistration.count({ where: { deviceLibraryIdentifier } });
    if (remaining === 0) {
      await tx.appleWalletDevice.deleteMany({ where: { deviceLibraryIdentifier } });
    }
  });

  return new Response(null, { status: 200 });
}

async function getUpdatedPasses(request: NextRequest, path: string[]) {
  const [, deviceLibraryIdentifier, , passTypeIdentifier] = path;
  if (!deviceLibraryIdentifier || !passTypeIdentifier || !isExpectedPassType(passTypeIdentifier)) {
    return new Response(null, { status: 404 });
  }

  const previousValue = request.nextUrl.searchParams.get("passesUpdatedSince");
  const parsedTimestamp = previousValue && /^\d+$/.test(previousValue) ? Number(previousValue) : null;
  const previousTimestamp = parsedTimestamp && Number.isSafeInteger(parsedTimestamp) && parsedTimestamp >= 0
    ? parsedTimestamp
    : null;
  const passes = await prisma.appleWalletPassRegistration.findMany({
    where: {
      deviceLibraryIdentifier,
      ...(previousTimestamp ? { loyaltyWalletPass: { updatedAt: { gt: new Date(previousTimestamp) } } } : {}),
    },
    select: {
      loyaltyWalletPass: { select: { serialNumber: true, updatedAt: true } },
    },
  });
  if (passes.length === 0) return new Response(null, { status: 204 });

  const lastUpdated = Math.max(...passes.map((pass) => pass.loyaltyWalletPass.updatedAt.getTime())).toString();
  return noStore(Response.json({
    serialNumbers: passes.map((pass) => pass.loyaltyWalletPass.serialNumber),
    lastUpdated,
  }));
}

async function getUpdatedPass(request: NextRequest, path: string[]) {
  const [, passTypeIdentifier, serialNumber] = path;
  if (!passTypeIdentifier || !serialNumber || !isExpectedPassType(passTypeIdentifier)) {
    return new Response(null, { status: 404 });
  }
  const authenticationToken = appleAuthenticationToken(request);
  if (!authenticationToken) return new Response(null, { status: 401 });

  try {
    const pass = await getAppleWalletPassBufferForRegistration(serialNumber, authenticationToken);
    if (!pass) return new Response(null, { status: 401 });
    return new Response(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Loyalty Wallet] Apple update pass generation failed:", error);
    return new Response(null, { status: 503 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path[0] === "devices" && path[2] === "registrations" && path.length === 4) {
    return getUpdatedPasses(request, path);
  }
  if (path[0] === "passes" && path.length === 3) return getUpdatedPass(request, path);
  return new Response(null, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length === 1 && path[0] === "log") return new Response(null, { status: 200 });
  if (path[0] === "devices" && path[2] === "registrations" && path.length === 5) {
    return registerPass(request, path);
  }
  return new Response(null, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path[0] === "devices" && path[2] === "registrations" && path.length === 5) {
    return unregisterPass(request, path);
  }
  return new Response(null, { status: 404 });
}
