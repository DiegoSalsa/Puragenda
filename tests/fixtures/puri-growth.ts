import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  assertGrowthSandbox,
  createGrowthScope,
} from "@/server/puri/growth/access";
import { configureGrowthBudget } from "@/server/puri/growth/budgets";
import { createPuriContext } from "@/server/puri/context";

export async function growthFixture(
  options: { team?: boolean; history?: boolean } = {},
) {
  assertGrowthSandbox();
  const now = new Date();
  const day = (ago: number, hour = 10) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - ago);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };
  const businessId = `growth-${randomUUID()}`;
  const user = await prisma.user.create({
    data: {
      name: "Synthetic owner",
      email: `${businessId}@example.invalid`,
      password: "synthetic-no-login",
      role: "ADMIN",
    },
  });
  await prisma.business.create({
    data: {
      id: businessId,
      name: "Synthetic growth business",
      slug: businessId,
      apiKey: randomUUID(),
      ownerId: user.id,
      timezone: "UTC",
      createdAt: day(400),
    },
  });
  await prisma.subscription.create({
    data: {
      businessId,
      plan: options.team ? "EQUIPO" : "INDIVIDUAL",
      status: "ACTIVE",
      isTrial: false,
      currentPeriodEnd: day(-30),
    },
  });
  await prisma.commercialSubscription.create({
    data: {
      businessId,
      catalogVersion: "2026-10-v2",
      planCode: "PURAGENDA_PLUS",
      billingCycle: "MONTHLY",
      professionalTotal: options.team ? 2 : 1,
      basePriceClp: 22990,
      totalPriceClp: options.team ? 25990 : 22990,
      status: "ACTIVE",
      snapshotHash: "synthetic",
      periodStart: day(20),
      periodEnd: day(-30),
      lastPaymentStatus: "CONFIRMED",
      lastPaymentAt: day(20),
      lastPaymentEventId: randomUUID(),
    },
  });
  const location = await prisma.businessLocation.create({
    data: {
      businessId,
      name: "Synthetic primary",
      slug: "primary",
      timezone: "UTC",
      isActive: true,
      isPrimary: true,
      createdAt: day(400),
    },
  });
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++)
    await prisma.locationHours.create({
      data: {
        locationId: location.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
    });
  const service = await prisma.service.create({
    data: { businessId, name: "Synthetic service", duration: 60, price: 10000 },
  });
  const staff = options.team
    ? await prisma.staff.create({
        data: {
          businessId,
          name: "Synthetic professional",
          createdAt: day(400),
        },
      })
    : null;
  if (staff) {
    await prisma.staffLocation.create({
      data: { staffId: staff.id, locationId: location.id },
    });
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++)
      await prisma.staffSchedule.create({
        data: {
          staffId: staff.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
        },
      });
  }
  async function appointment(
    ago: number,
    extra: Partial<Prisma.AppointmentUncheckedCreateInput> = {},
  ) {
    const startTime = day(ago),
      endTime = new Date(+startTime + 60 * 60000);
    return prisma.appointment.create({
      data: {
        businessId,
        locationId: location.id,
        staffId: staff?.id,
        serviceId: service.id,
        customerName: "PRIVATE_CUSTOMER_SENTINEL",
        customerEmail: "private-customer@example.invalid",
        startTime,
        endTime,
        status: "COMPLETED",
        ...extra,
      },
    });
  }
  if (options.history !== false) {
    for (let i = 0; i < 6; i++) {
      const c = await prisma.client.create({
        data: {
          businessId,
          name: "PRIVATE_CLIENT_SENTINEL",
          email: `private-${i}@example.invalid`,
          privateNotes: "PRIVATE_NOTES_SENTINEL",
          acceptsMarketing: true,
        },
      });
      await appointment(70 + i, { clientId: c.id });
      if (i === 5)
        await appointment(-5, { clientId: c.id, status: "CONFIRMED" });
    }
    for (let i = 0; i < 12; i++) await appointment(30 + i);
    await appointment(7, {
      totalPrice: 10000,
      depositAmount: 2000,
      paymentStatus: "APPROVED",
      giftCardPaidAmount: 500,
    });
    await appointment(6, { totalPrice: 10000, settledAt: day(6) });
  }
  await configureGrowthBudget({
    businessId: null,
    category: "ALL",
    limitMicros: 1000000,
    limitUnits: 10000,
  });
  for (const category of [
    "ALL",
    "ANALYSIS_SQL",
    "PROACTIVE_SQL",
    "PLUS_INTERACTIVE",
    "RECOMMENDATION",
  ] as const)
    await configureGrowthBudget({
      businessId,
      category,
      limitMicros: 100000,
      limitUnits: 1000,
    });
  const context = await createPuriContext(user, {
      pathname: "/dashboard",
      locale: "es",
    }),
    scope = await createGrowthScope(context);
  return {
    businessId,
    user,
    location,
    service,
    staff,
    context,
    scope,
    appointment,
    day,
    now,
  };
}
export async function deleteGrowthFixture(
  f: Awaited<ReturnType<typeof growthFixture>>,
) {
  await prisma.business.delete({ where: { id: f.businessId } });
  await prisma.user.delete({ where: { id: f.user.id } });
}
