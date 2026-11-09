/**
 * Pure Milestone & Idempotency Calculation Engine
 * Platform-independent, zero chrome.* imports, deterministic with injected `now`.
 */

import {
  GroupEntity,
  GroupNotificationState,
  DueMilestone,
  ObsoleteMilestone,
  ReconcileCalculationResult,
  MilestoneType,
} from './types';

/**
 * Evaluates all groups and returns due milestones, obsolete milestones to suppress,
 * distinct overdue group count, and the earliest upcoming milestone timestamp.
 */
export function computeDueMilestones(
  groups: Record<string, GroupEntity>,
  notificationState: Record<string, GroupNotificationState>,
  now: number
): ReconcileCalculationResult {
  const dueMilestones: DueMilestone[] = [];
  const obsoleteMilestones: ObsoleteMilestone[] = [];
  const overdueGroupIds = new Set<string>();

  let nextMilestoneMs: number | null = null;

  for (const group of Object.values(groups)) {
    // 1. Skip closed and permanent groups
    if (group.markedClosedAt !== null || group.expiresAt === null) {
      continue;
    }

    const groupNotif = notificationState[group.id] || {};
    const reminderLeadMs = (group.effectiveReminderMinutes ?? 120) * 60 * 1000;
    const reminderTargetMs = group.expiresAt - reminderLeadMs;
    const expiryTargetMs = group.expiresAt;
    const graceEndTargetMs = group.graceEndsAt;

    // --- TRACK UPCOMING NEXT MILESTONES (targetMs > now) ---
    const checkUpcoming = (target: number | null) => {
      if (target !== null && target > now) {
        if (nextMilestoneMs === null || target < nextMilestoneMs) {
          nextMilestoneMs = target;
        }
      }
    };

    checkUpcoming(reminderTargetMs);
    checkUpcoming(expiryTargetMs);
    checkUpcoming(graceEndTargetMs);

    // --- EVALUATE DUE MILESTONES (targetMs <= now) ---
    const isReminderDue = reminderTargetMs <= now;
    const isExpiryDue = expiryTargetMs <= now;
    const isGraceEndDue = graceEndTargetMs !== null && graceEndTargetMs <= now;

    // Check delivery status
    const isReminderDelivered = groupNotif.reminder?.targetMs === reminderTargetMs &&
      groupNotif.reminder?.status === 'DELIVERED';
    const isExpiryDelivered = groupNotif.expiry?.targetMs === expiryTargetMs &&
      groupNotif.expiry?.status === 'DELIVERED';
    const isGraceEndDelivered = graceEndTargetMs !== null &&
      groupNotif.graceEnd?.targetMs === graceEndTargetMs &&
      groupNotif.graceEnd?.status === 'DELIVERED';

    // Obsolete Suppression Rules:
    // 1. If group is already expired, any unnotified reminder milestone is obsolete.
    if (isExpiryDue && isReminderDue && !isReminderDelivered) {
      obsoleteMilestones.push({
        groupId: group.id,
        milestone: 'REMINDER',
        targetMs: reminderTargetMs,
      });
    }

    // 2. If group is past graceEnd, any unnotified expiry milestone is obsolete in favor of graceEnd.
    if (isGraceEndDue && isExpiryDue && !isExpiryDelivered) {
      obsoleteMilestones.push({
        groupId: group.id,
        milestone: 'EXPIRY',
        targetMs: expiryTargetMs,
      });
    }

    // Select the latest, most relevant overdue milestone for this distinct group
    let candidateMilestone: { milestone: MilestoneType; targetMs: number } | null = null;

    if (isGraceEndDue && !isGraceEndDelivered) {
      candidateMilestone = { milestone: 'GRACE_END', targetMs: graceEndTargetMs! };
    } else if (isExpiryDue && !isExpiryDelivered) {
      candidateMilestone = { milestone: 'EXPIRY', targetMs: expiryTargetMs };
    } else if (isReminderDue && !isReminderDelivered && !isExpiryDue) {
      // Only fire reminder if NOT already expired
      candidateMilestone = { milestone: 'REMINDER', targetMs: reminderTargetMs };
    }

    if (candidateMilestone) {
      dueMilestones.push({
        groupId: group.id,
        groupName: group.name,
        milestone: candidateMilestone.milestone,
        targetMs: candidateMilestone.targetMs,
        overdueByMs: now - candidateMilestone.targetMs,
      });
      overdueGroupIds.add(group.id);
    }
  }

  return {
    dueMilestones,
    obsoleteMilestones,
    distinctOverdueGroupsCount: overdueGroupIds.size,
    nextMilestoneMs,
  };
}

