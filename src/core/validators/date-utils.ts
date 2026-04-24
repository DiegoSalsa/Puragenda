// ═══════════════════════════════════════════
// Puragenda — Pure Date Validation Logic
// ═══════════════════════════════════════════
// No database or framework dependencies.
// These are pure functions that can be unit-tested independently.

import type { TimeSlot, BlockedSlot } from "@/core/entities";

/**
 * Checks if two time intervals overlap.
 *
 * Two half-open intervals [a_start, a_end) and [b_start, b_end) overlap
 * if and only if: a_start < b_end AND a_end > b_start
 *
 * @returns true if the intervals overlap
 */
export function hasTimeOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date
): boolean {
  return newStart < existingEnd && newEnd > existingStart;
}

/**
 * Checks if a proposed time slot conflicts with any existing slot.
 *
 * @returns The first conflicting slot, or null if no conflicts
 */
export function findConflictingSlot(
  newStart: Date,
  newEnd: Date,
  existingSlots: { startTime: Date; endTime: Date }[]
): { startTime: Date; endTime: Date } | null {
  for (const slot of existingSlots) {
    if (hasTimeOverlap(newStart, newEnd, slot.startTime, slot.endTime)) {
      return slot;
    }
  }
  return null;
}

/**
 * Determines if a candidate slot is blocked by any existing appointment.
 */
export function isSlotBlocked(
  candidate: TimeSlot,
  blockedSlots: BlockedSlot[]
): boolean {
  for (const blocked of blockedSlots) {
    const blockedStart = new Date(blocked.startTime);
    const blockedEnd = new Date(blocked.endTime);
    if (hasTimeOverlap(candidate.start, candidate.end, blockedStart, blockedEnd)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates that a start time is before end time and both are in the future.
 */
export function validateTimeRange(
  startTime: Date,
  endTime: Date
): { valid: boolean; error?: string } {
  const now = new Date();

  if (startTime >= endTime) {
    return { valid: false, error: "La hora de inicio debe ser anterior a la hora de fin" };
  }

  if (startTime <= now) {
    return { valid: false, error: "La hora de inicio debe ser en el futuro" };
  }

  return { valid: true };
}
