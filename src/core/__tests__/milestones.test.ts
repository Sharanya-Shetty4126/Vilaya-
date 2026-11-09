import { describe, it, expect } from 'vitest';
import { computeDueMilestones } from '../milestones';
import { GroupEntity, GroupNotificationState } from '../types';

describe('computeDueMilestones idempotency and reconciliation', () => {
  const baseEpoch = 1700000000000; // Realistic epoch ms
  const group1: GroupEntity = {
    id: 'grp-1',
    name: 'Hackathon Chat',
    createdAt: baseEpoch,
    updatedAt: baseEpoch,
    expiresAt: baseEpoch + 24 * 3600 * 1000, // +24 hours
    graceEndsAt: baseEpoch + (24 + 12) * 3600 * 1000, // +12 hours grace
    markedClosedAt: null,
    effectiveReminderMinutes: 120, // 2 hours before expiry
    effectiveGraceHours: 12,
  };

  it('detects due reminder milestone before expiry', () => {
    const groups = { 'grp-1': { ...group1 } };
    const reminderTarget = group1.expiresAt! - (120 * 60 * 1000); // T - 2h

    // Set now to 1 hour before expiry (past reminder, before expiry)
    const now = group1.expiresAt! - (60 * 60 * 1000);
    const notifState: Record<string, GroupNotificationState> = {};

    const res = computeDueMilestones(groups, notifState, now);
    expect(res.dueMilestones).toHaveLength(1);
    expect(res.dueMilestones[0].milestone).toBe('REMINDER');
    expect(res.dueMilestones[0].targetMs).toBe(reminderTarget);
    expect(res.distinctOverdueGroupsCount).toBe(1);
    expect(res.nextMilestoneMs).toBe(group1.expiresAt); // next is expiry
  });

  it('suppresses obsolete reminder if group is already EXPIRED', () => {
    const groups = {
      'grp-1': {
        ...group1,
        graceEndsAt: null, // no grace
      },
    };
    // now is 1 hour after expiry: group is already EXPIRED, and reminder was never delivered
    const now = group1.expiresAt! + (60 * 60 * 1000);
    const notifState: Record<string, GroupNotificationState> = {};

    const res = computeDueMilestones(groups, notifState, now);
    // Should NOT notify reminder; should select EXPIRY!
    expect(res.dueMilestones).toHaveLength(1);
    expect(res.dueMilestones[0].milestone).toBe('EXPIRY');
    // Obsolete reminder should be captured for acknowledgment
    expect(res.obsoleteMilestones).toHaveLength(1);
    expect(res.obsoleteMilestones[0].milestone).toBe('REMINDER');
  });

  it('selects latest milestone (GRACE_END) when both expiry and graceEnd are overdue', () => {
    const groups = { 'grp-1': { ...group1 } };
    // now is 1 hour past graceEnd
    const now = group1.graceEndsAt! + (60 * 60 * 1000);
    const notifState: Record<string, GroupNotificationState> = {};

    const res = computeDueMilestones(groups, notifState, now);
    expect(res.dueMilestones).toHaveLength(1);
    expect(res.dueMilestones[0].milestone).toBe('GRACE_END');
    expect(res.dueMilestones[0].targetMs).toBe(group1.graceEndsAt);
    expect(res.obsoleteMilestones.some((m) => m.milestone === 'EXPIRY')).toBe(true);
  });

  it('enforces idempotency: does not duplicate notification if target is already DELIVERED', () => {
    const groups = {
      'grp-1': {
        ...group1,
        graceEndsAt: null,
      },
    };
    const now = group1.expiresAt! + 1000;

    // Simulation: Run 1
    const notifState: Record<string, GroupNotificationState> = {};
    const run1 = computeDueMilestones(groups, notifState, now);
    expect(run1.dueMilestones).toHaveLength(1);
    expect(run1.dueMilestones[0].milestone).toBe('EXPIRY');

    // Marker recorded as DELIVERED
    notifState['grp-1'] = {
      expiry: {
        targetMs: group1.expiresAt!,
        status: 'DELIVERED',
        deliveredAt: now,
      },
    };

    // Simulation: Run 2 (Immediately after)
    const run2 = computeDueMilestones(groups, notifState, now);
    expect(run2.dueMilestones).toHaveLength(0); // IDEMPOTENT! Zero duplicate notifications

    // Simulation: Run 3 (Even later)
    const run3 = computeDueMilestones(groups, notifState, now + 50000);
    expect(run3.dueMilestones).toHaveLength(0); // Still 0!
  });

  it('counts distinct overdue groups correctly and ignores groups whose reminder is in the future', () => {
    const gExpiry = baseEpoch + 10 * 3600 * 1000;
    const groups: Record<string, GroupEntity> = {
      'g-1': { ...group1, id: 'g-1', expiresAt: gExpiry, graceEndsAt: null },
      'g-2': { ...group1, id: 'g-2', expiresAt: gExpiry + 1000, graceEndsAt: null },
      'g-3': { ...group1, id: 'g-3', expiresAt: gExpiry + 2000, graceEndsAt: null },
      // g-4 expires in 48 hours, reminder is 2h before (46h in the future). At now = gExpiry + 5000, g-4 is far in the future
      'g-4': {
        ...group1,
        id: 'g-4',
        expiresAt: baseEpoch + 48 * 3600 * 1000,
        graceEndsAt: null,
        effectiveReminderMinutes: 120,
      },
    };
    const now = gExpiry + 5000;
    const notifState: Record<string, GroupNotificationState> = {};

    const res = computeDueMilestones(groups, notifState, now);
    expect(res.distinctOverdueGroupsCount).toBe(3);
    expect(res.dueMilestones).toHaveLength(3);
    // nextMilestoneMs should be g-4's reminder milestone
    const g4Reminder = (baseEpoch + 48 * 3600 * 1000) - (120 * 60 * 1000);
    expect(res.nextMilestoneMs).toBe(g4Reminder);
  });
});
