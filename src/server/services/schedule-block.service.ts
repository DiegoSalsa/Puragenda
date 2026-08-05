import type { Prisma, ScheduleBlockType } from "@prisma/client";

type PublicBlockState = {
  type: ScheduleBlockType;
  releaseAt: Date | null;
};

export function isScheduleBlockPubliclyBlocking(
  block: PublicBlockState,
  now: Date = new Date(),
) {
  if (block.type === "UNAVAILABLE") return true;
  return !block.releaseAt || block.releaseAt > now;
}

export function getPublicBlockingScheduleBlockWhere(
  now: Date = new Date(),
): Prisma.ScheduleBlockWhereInput {
  return {
    OR: [
      { type: "UNAVAILABLE" },
      {
        type: "PRIORITY",
        OR: [{ releaseAt: null }, { releaseAt: { gt: now } }],
      },
    ],
  };
}

export function calculatePriorityReleaseAt(
  startTime: Date,
  releaseHoursBefore?: number | null,
) {
  if (releaseHoursBefore == null) return null;
  return new Date(startTime.getTime() - releaseHoursBefore * 60 * 60 * 1000);
}
