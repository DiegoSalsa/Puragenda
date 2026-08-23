import "server-only";

import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import http2 from "node:http2";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { prisma } from "@/server/db/prisma";
import { getClientPortalAppUrl } from "@/server/services/client-portal.service";

const GOOGLE_WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_WALLET_API_URL = "https://walletobjects.googleapis.com/walletobjects/v1";

type GoogleWalletConfig = {
  issuerId: string;
  serviceAccountEmail: string;
  privateKey: string;
};

type AppleWalletConfig = {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signerCert: Buffer;
  signerKey: Buffer;
  wwdr: Buffer;
  signerKeyPassphrase?: string;
};

type WalletPassData = Awaited<ReturnType<typeof getLoyaltyWalletPassForClient>>;

let googleAccessTokenCache: { value: string; expiresAt: number } | null = null;

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

function decodeCertificate(value: string) {
  const normalized = normalizePem(value);
  return Buffer.from(normalized, normalized.includes("-----BEGIN") ? "utf8" : "base64");
}

function getGoogleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (!issuerId || !serviceAccountEmail || !privateKey) return null;
  return { issuerId, serviceAccountEmail, privateKey: normalizePem(privateKey) };
}

function getAppleWalletConfig(): AppleWalletConfig | null {
  const passTypeIdentifier = process.env.APPLE_WALLET_PASS_TYPE_IDENTIFIER?.trim();
  const teamIdentifier = process.env.APPLE_WALLET_TEAM_IDENTIFIER?.trim();
  const signerCert = process.env.APPLE_WALLET_SIGNER_CERT_BASE64?.trim();
  const signerKey = process.env.APPLE_WALLET_SIGNER_KEY_BASE64?.trim();
  const wwdr = process.env.APPLE_WALLET_WWDR_CERT_BASE64?.trim();

  if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey || !wwdr) return null;
  return {
    passTypeIdentifier,
    teamIdentifier,
    signerCert: decodeCertificate(signerCert),
    signerKey: decodeCertificate(signerKey),
    wwdr: decodeCertificate(wwdr),
    signerKeyPassphrase: process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE,
  };
}

export function getLoyaltyWalletAvailability() {
  return {
    google: Boolean(getGoogleWalletConfig()),
    apple: Boolean(getAppleWalletConfig()),
  };
}

function getAppUrl() {
  return getClientPortalAppUrl();
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function signRs256(claims: Record<string, unknown>, privateKey: string) {
  const encodedHeader = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedClaims = toBase64Url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString("base64url")}`;
}

async function getGoogleAccessToken(config: GoogleWalletConfig) {
  if (googleAccessTokenCache && googleAccessTokenCache.expiresAt > Date.now() + 60_000) {
    return googleAccessTokenCache.value;
  }

  const now = Math.floor(Date.now() / 1_000);
  const assertion = signRs256({
    iss: config.serviceAccountEmail,
    scope: GOOGLE_WALLET_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3_600,
  }, config.privateKey);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Wallet OAuth failed (${response.status})`);
  }

  const body = await response.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Google Wallet OAuth did not return an access token");

  googleAccessTokenCache = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3_000) * 1_000,
  };
  return body.access_token;
}

async function googleWalletRequest(
  config: GoogleWalletConfig,
  resource: string,
  init: RequestInit = {},
) {
  const accessToken = await getGoogleAccessToken(config);
  return fetch(`${GOOGLE_WALLET_API_URL}/${resource}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

async function ensureGoogleWalletClass(config: GoogleWalletConfig) {
  const classId = `${config.issuerId}.puragenda_loyalty`;
  const response = await googleWalletRequest(config, "genericClass", {
    method: "POST",
    body: JSON.stringify({ id: classId }),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(`Google Wallet could not create the loyalty class (${response.status})`);
  }
  return classId;
}

function localizedValue(value: string) {
  return { defaultValue: { language: "es-419", value } };
}

function rewardSummary(data: NonNullable<WalletPassData>) {
  const rewards = data.client.loyaltyCodes;
  if (rewards.length === 0) return "Aún no tienes premios disponibles";
  if (rewards.length === 1) return rewards[0].rewardName || "Tienes un premio disponible";
  return `${rewards.length} premios disponibles`;
}

function rewardCodes(data: NonNullable<WalletPassData>) {
  const codes = data.client.loyaltyCodes.slice(0, 3).map((reward) => reward.code);
  return codes.length > 0 ? codes.join(" · ") : "Sin premios disponibles";
}

function preferredLogoUrl(data: NonNullable<WalletPassData>) {
  const configuredLogo = data.client.business.logoUrl;
  if (configuredLogo && /^https:\/\//i.test(configuredLogo)) return configuredLogo;
  return `${getAppUrl()}/icon-512x512.png`;
}

function googleObjectId(config: GoogleWalletConfig, data: NonNullable<WalletPassData>) {
  return `${config.issuerId}.loyalty_${data.walletPass.scanToken}`;
}

function googleObjectPayload(
  config: GoogleWalletConfig,
  classId: string,
  data: NonNullable<WalletPassData>,
) {
  const required = Math.max(1, data.client.business.stampsRequired);
  const stamps = `${data.client.currentStamps} de ${required}`;
  const business = data.client.business;
  const portalUrl = `${getAppUrl()}/mis-premios/${data.client.id}`;

  return {
    id: googleObjectId(config, data),
    classId,
    state: "ACTIVE",
    genericType: "GENERIC_LOYALTY_CARD",
    cardTitle: localizedValue(business.name),
    subheader: localizedValue("Tarjeta de fidelización"),
    header: localizedValue(stamps),
    logo: {
      sourceUri: { uri: preferredLogoUrl(data) },
      contentDescription: localizedValue(`Logo de ${business.name}`),
    },
    hexBackgroundColor: business.primaryColor || "#7C3AED",
    barcode: {
      type: "QR_CODE",
      value: `PURAGENDA:LOYALTY:${data.walletPass.scanToken}`,
      alternateText: "Tarjeta de fidelización",
    },
    textModulesData: [
      { id: "stamp_progress", header: "TIMBRES", body: stamps },
      { id: "reward_status", header: "PREMIO", body: rewardSummary(data) },
      { id: "reward_codes", header: "CÓDIGOS DISPONIBLES", body: rewardCodes(data) },
    ],
    linksModuleData: {
      uris: [{ id: "portal", uri: portalUrl, description: "Ver mi tarjeta en Puragenda" }],
    },
  };
}

async function upsertGoogleWalletPass(data: NonNullable<WalletPassData>) {
  const config = getGoogleWalletConfig();
  if (!config) return;

  const classId = await ensureGoogleWalletClass(config);
  const object = googleObjectPayload(config, classId, data);
  const encodedObjectId = encodeURIComponent(object.id);
  const patch = await googleWalletRequest(config, `genericObject/${encodedObjectId}`, {
    method: "PATCH",
    body: JSON.stringify(object),
  });

  if (patch.ok) return;
  if (patch.status !== 404) {
    throw new Error(`Google Wallet could not update the loyalty pass (${patch.status})`);
  }

  const insert = await googleWalletRequest(config, "genericObject", {
    method: "POST",
    body: JSON.stringify(object),
  });
  if (insert.ok) return;
  if (insert.status === 409) {
    const retry = await googleWalletRequest(config, `genericObject/${encodedObjectId}`, {
      method: "PATCH",
      body: JSON.stringify(object),
    });
    if (retry.ok) return;
  }
  throw new Error(`Google Wallet could not create the loyalty pass (${insert.status})`);
}

function createGoogleSaveUrl(config: GoogleWalletConfig, data: NonNullable<WalletPassData>) {
  const now = Math.floor(Date.now() / 1_000);
  const origin = new URL(getAppUrl()).hostname;
  const objectId = googleObjectId(config, data);
  const classId = `${config.issuerId}.puragenda_loyalty`;
  const jwt = signRs256({
    iss: config.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    origins: [origin],
    iat: now,
    exp: now + 3_600,
    payload: {
      genericObjects: [{ id: objectId, classId }],
    },
  }, config.privateKey);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

function toRgb(hex: string | null | undefined, fallback: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!match) return fallback;
  return `rgb(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)})`;
}

async function getAppleIcon() {
  return readFile(path.join(process.cwd(), "public", "icon-512x512.png"));
}

async function createAppleWalletPass(data: NonNullable<WalletPassData>) {
  const config = getAppleWalletConfig();
  if (!config) throw new Error("Apple Wallet is not configured");

  const business = data.client.business;
  const required = Math.max(1, business.stampsRequired);
  const stamps = `${data.client.currentStamps} de ${required}`;
  const icon = await getAppleIcon();
  const pass = new PKPass({
    "icon.png": icon,
    "icon@2x.png": icon,
    "icon@3x.png": icon,
    "pass.json": Buffer.from(JSON.stringify({
      formatVersion: 1,
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
      serialNumber: data.walletPass.serialNumber,
      organizationName: business.name,
      description: `Tarjeta de fidelización de ${business.name}`,
      logoText: business.name,
      backgroundColor: toRgb(business.primaryColor, "rgb(124, 58, 237)"),
      foregroundColor: toRgb(business.textColor, "rgb(255, 255, 255)"),
      labelColor: toRgb(business.textColor, "rgb(255, 255, 255)"),
      webServiceURL: `${getAppUrl()}/api/wallet/apple/v1`,
      authenticationToken: data.walletPass.appleAuthenticationToken,
      storeCard: {
        primaryFields: [{
          key: "stamps",
          label: "TIMBRES",
          value: stamps,
          changeMessage: "Tu avance de timbres cambió a %@.",
        }],
        secondaryFields: [{
          key: "reward",
          label: "PRÓXIMO PREMIO",
          value: business.rewardName || "Premio de fidelización",
        }],
        auxiliaryFields: [{
          key: "rewards",
          label: "PREMIOS DISPONIBLES",
          value: String(data.client.loyaltyCodes.length),
          changeMessage: "Ahora tienes %@ premios disponibles.",
        }],
        backFields: [
          { key: "reward-description", label: "PREMIO", value: rewardSummary(data) },
          { key: "reward-codes", label: "CÓDIGOS DISPONIBLES", value: rewardCodes(data) },
          { key: "portal", label: "MI TARJETA", value: `${getAppUrl()}/mis-premios/${data.client.id}` },
        ],
        headerFields: [],
      },
    })),
  }, {
    wwdr: config.wwdr,
    signerCert: config.signerCert,
    signerKey: config.signerKey,
    signerKeyPassphrase: config.signerKeyPassphrase,
  });

  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: `PURAGENDA:LOYALTY:${data.walletPass.scanToken}`,
    messageEncoding: "iso-8859-1",
    altText: "Tarjeta de fidelización",
  });
  return pass.getAsBuffer();
}

function walletPassCreateData(clientId: string) {
  return {
    clientId,
    serialNumber: `loyalty-${crypto.randomBytes(18).toString("hex")}`,
    scanToken: crypto.randomBytes(24).toString("base64url"),
    appleAuthenticationToken: crypto.randomBytes(32).toString("base64url"),
  };
}

export async function getLoyaltyWalletPassForClient(clientId: string, email?: string | null) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      ...(email ? { email: { equals: email, mode: "insensitive" } } : {}),
    },
    include: {
      business: {
        select: {
          name: true,
          stampsRequired: true,
          rewardName: true,
          isLoyaltyEnabled: true,
          primaryColor: true,
          textColor: true,
          logoUrl: true,
        },
      },
      loyaltyCodes: {
        where: { isUsed: false },
        orderBy: { createdAt: "desc" },
        select: { code: true, rewardName: true },
      },
    },
  });

  if (!client || !client.business.isLoyaltyEnabled) return null;
  const walletPass = await prisma.loyaltyWalletPass.upsert({
    where: { clientId: client.id },
    create: walletPassCreateData(client.id),
    update: {},
  });
  return { client, walletPass };
}

export async function getGoogleWalletSaveUrl(clientId: string, email: string) {
  const config = getGoogleWalletConfig();
  if (!config) return null;
  const data = await getLoyaltyWalletPassForClient(clientId, email);
  if (!data) return null;

  await upsertGoogleWalletPass(data);
  return createGoogleSaveUrl(config, data);
}

export async function getAppleWalletPass(clientId: string, email: string) {
  const data = await getLoyaltyWalletPassForClient(clientId, email);
  if (!data || !getAppleWalletConfig()) return null;
  return createAppleWalletPass(data);
}

function safeTokenEquals(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function getAppleWalletPassForRegistration(serialNumber: string, authenticationToken: string) {
  const config = getAppleWalletConfig();
  if (!config) return null;
  const walletPass = await prisma.loyaltyWalletPass.findUnique({
    where: { serialNumber },
    select: { id: true, clientId: true, appleAuthenticationToken: true },
  });
  if (!walletPass || !safeTokenEquals(walletPass.appleAuthenticationToken, authenticationToken)) return null;

  const data = await getLoyaltyWalletPassForClient(walletPass.clientId);
  return data?.walletPass.id === walletPass.id ? data : null;
}

export async function getAppleWalletPassBufferForRegistration(serialNumber: string, authenticationToken: string) {
  const data = await getAppleWalletPassForRegistration(serialNumber, authenticationToken);
  return data ? createAppleWalletPass(data) : null;
}

export function getAppleWalletPassTypeIdentifier() {
  return getAppleWalletConfig()?.passTypeIdentifier ?? null;
}

async function sendApplePassPush(config: AppleWalletConfig, pushToken: string) {
  const client = http2.connect("https://api.push.apple.com", {
    cert: config.signerCert,
    key: config.signerKey,
    passphrase: config.signerKeyPassphrase,
  });

  try {
    return await new Promise<number>((resolve, reject) => {
      client.once("error", reject);
      const request = client.request({
        ":method": "POST",
        ":path": `/3/device/${pushToken}`,
        "apns-topic": config.passTypeIdentifier,
        "apns-push-type": "background",
        "apns-priority": "5",
      });
      request.once("response", (headers) => resolve(Number(headers[":status"] || 500)));
      request.once("error", reject);
      request.end("{}");
    });
  } finally {
    client.close();
  }
}

async function notifyAppleWalletPassUpdated(loyaltyWalletPassId: string) {
  const config = getAppleWalletConfig();
  if (!config) return;

  const registrations = await prisma.appleWalletPassRegistration.findMany({
    where: { loyaltyWalletPassId },
    include: { device: { select: { pushToken: true } } },
  });
  await Promise.allSettled(registrations.map(async (registration) => {
    const status = await sendApplePassPush(config, registration.device.pushToken);
    if (status === 400 || status === 410) {
      await prisma.appleWalletPassRegistration.delete({ where: { id: registration.id } });
    }
    if (status >= 300 && status !== 400 && status !== 410) {
      throw new Error(`Apple Wallet push failed (${status})`);
    }
  }));
}

/** Synchronize an already-issued card after loyalty state changes. */
export async function refreshLoyaltyWalletPass(clientId: string) {
  if (!getGoogleWalletConfig() && !getAppleWalletConfig()) return;
  // Do not create cards merely because a client attends an appointment. A pass
  // is issued only after the client explicitly chooses a Wallet save flow.
  const existingPass = await prisma.loyaltyWalletPass.findUnique({
    where: { clientId },
    select: { id: true },
  });
  if (!existingPass) return;

  const data = await getLoyaltyWalletPassForClient(clientId);
  if (!data) return;

  const walletPass = await prisma.loyaltyWalletPass.update({
    where: { id: data.walletPass.id },
    data: { updatedAt: new Date() },
  });
  const refreshedData = { ...data, walletPass };

  const results = await Promise.allSettled([
    upsertGoogleWalletPass(refreshedData),
    notifyAppleWalletPassUpdated(walletPass.id),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[Loyalty Wallet] Could not synchronize a pass:", result.reason);
    }
  }
}
