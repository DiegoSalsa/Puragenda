import { prisma } from "@/backend/db/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 12;

function toSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "mi-negocio";
}

async function generateUniqueBusinessSlug(
  baseSlug: string,
  tx: Prisma.TransactionClient
) {
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await tx.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

function createApiKey() {
  return `pc_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Registrar un nuevo usuario con contraseña encriptada.
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
}) {
  // Verificar si ya existe un usuario con ese email
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    return { success: false as const, error: "Ya existe una cuenta con ese email" };
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: "OWNER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const businessName = `${data.name} Negocio`;
    const baseSlug = toSlug(data.name);
    const slug = await generateUniqueBusinessSlug(baseSlug, tx);

    const business = await tx.business.create({
      data: {
        name: businessName,
        slug,
        apiKey: createApiKey(),
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    await tx.subscription.create({
      data: {
        businessId: business.id,
        plan: "FREE",
        status: "ACTIVE",
      },
    });

    return { user, business };
  });

  return {
    success: true as const,
    user: created.user,
    business: created.business,
  };
}

/**
 * Verificar las credenciales de un usuario.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  // No devolver la contraseña
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
