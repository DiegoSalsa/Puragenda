import { prisma } from "@/server/db/prisma";

/**
 * Get all active staff for a business.
 */
export async function getStaffByBusinessId(businessId: string) {
  return prisma.staff.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get a staff member by ID, verifying it belongs to the business.
 */
export async function getStaffByIdAndBusiness(
  staffId: string,
  businessId: string
) {
  return prisma.staff.findFirst({
    where: { id: staffId, businessId, isActive: true },
  });
}

/**
 * Create a new staff member.
 */
export async function createStaff(data: {
  name: string;
  email?: string;
  businessId: string;
  userId?: string;
}) {
  return prisma.staff.create({
    data: {
      name: data.name,
      email: data.email,
      businessId: data.businessId,
      userId: data.userId,
      isActive: true,
    },
  });
}
