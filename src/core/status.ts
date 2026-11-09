/**
 * Pure Computed Group Status
 * Platform-independent, deterministic, zero Date.now() or chrome.* calls.
 */

import { GroupEntity, GroupStatus } from './types';

export function getGroupStatus(
  group: Pick<GroupEntity, 'markedClosedAt' | 'expiresAt' | 'graceEndsAt' | 'effectiveReminderMinutes'>,
  now: number
): GroupStatus {
  // 1. Manually closed in VILAYA always supersedes any time-based status
  if (group.markedClosedAt !== null) {
    return 'CLOSED';
  }

  // 2. Permanent groups ("Never") have no expiration
  if (group.expiresAt === null) {
    return 'PERMANENT';
  }

  const effectiveEnd = group.graceEndsAt ?? group.expiresAt;

  // 3. Past the final endpoint (including grace period if configured)
  if (now >= effectiveEnd) {
    return 'EXPIRED';
  }

  // 4. In Grace Period: past base expiry, but before graceEndsAt
  if (group.graceEndsAt !== null && now >= group.expiresAt && now < group.graceEndsAt) {
    return 'GRACE_PERIOD';
  }

  // 5. Expiring Soon: within reminder window before base expiry
  const reminderMs = (group.effectiveReminderMinutes ?? 120) * 60 * 1000;
  const reminderThreshold = group.expiresAt - reminderMs;
  if (now >= reminderThreshold && now < group.expiresAt) {
    return 'EXPIRING_SOON';
  }

  // 6. Healthy Active
  return 'ACTIVE';
}

