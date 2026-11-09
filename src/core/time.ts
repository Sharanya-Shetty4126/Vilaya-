/**
 * Pure Time Utilities
 * Platform-independent, deterministic, uses injected `now`.
 */

import { GroupEntity } from './types';

/**
 * Calculates inclusive 23:59:59.999 local time for N days from baseDate.
 * Uses local calendar components (Year, Month, Date) to be DST- and leap-year safe.
 */
export function getEndOfLocalDay(daysFromNow: number = 0, baseDate: Date = new Date()): number {
  const target = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + daysFromNow,
    23,
    59,
    59,
    999
  );
  return target.getTime();
}

/**
 * Explicit Extension Semantics:
 * - Active group: newExpiresAt = expiresAt + deltaMs
 * - Expired or in-grace group: newExpiresAt = now + deltaMs
 * - Always recalculates graceEndsAt = newExpiresAt + (effectiveGraceHours * 3600000)
 * - Closed groups throw an error (must be reopened explicitly)
 */
export function calculateExtension(
  group: Pick<GroupEntity, 'markedClosedAt' | 'expiresAt' | 'graceEndsAt' | 'effectiveGraceHours'>,
  deltaMs: number,
  now: number
): { expiresAt: number; graceEndsAt: number | null } {
  if (group.markedClosedAt !== null) {
    throw new Error('Closed groups cannot be extended. Reopen the group first.');
  }

  if (group.expiresAt === null) {
    throw new Error('Permanent groups do not have an expiration to extend.');
  }

  if (deltaMs <= 0) {
    throw new Error('Extension duration must be positive.');
  }

  let newExpiresAt: number;
  const effectiveEnd = group.graceEndsAt ?? group.expiresAt;

  if (now < group.expiresAt) {
    // Currently active
    newExpiresAt = group.expiresAt + deltaMs;
  } else {
    // Currently in grace period or fully expired
    newExpiresAt = now + deltaMs;
  }

  const graceMs = (group.effectiveGraceHours ?? 0) * 3600 * 1000;
  const newGraceEndsAt = graceMs > 0 ? newExpiresAt + graceMs : null;

  return {
    expiresAt: newExpiresAt,
    graceEndsAt: newGraceEndsAt,
  };
}

/**
 * Decomposes remaining milliseconds into distinct unit parts
 */
export function getRemainingParts(targetMs: number, now: number): {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} {
  const diff = targetMs - now;
  const isPast = diff <= 0;
  const totalMs = Math.max(0, diff);

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  return { totalMs, days, hours, minutes, seconds, isPast };
}

/**
 * Formats remaining time concisely (e.g. "3d 4h", "5h 22m", "08:45")
 */
export function formatCountdown(targetMs: number, now: number): string {
  const { days, hours, minutes, seconds, isPast } = getRemainingParts(targetMs, now);
  if (isPast) return '0s';

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Deterministic human-readable date & time formatter
 */
export function formatDateTime(
  epochMs: number | null,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  if (epochMs === null) return 'Never (Permanent)';
  const date = new Date(epochMs);
  return date.toLocaleString(locale, options ?? {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

