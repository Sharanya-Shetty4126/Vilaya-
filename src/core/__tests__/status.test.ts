import { describe, it, expect } from 'vitest';
import { getGroupStatus } from '../status';
import { GroupEntity } from '../types';

describe('getGroupStatus pure state function', () => {
  const baseGroup: GroupEntity = {
    id: 'grp-1',
    name: 'Hackathon Team',
    createdAt: 1000000,
    updatedAt: 1000000,
    expiresAt: 2000000,
    graceEndsAt: 2500000,
    markedClosedAt: null,
    effectiveReminderMinutes: 60, // 3,600,000 ms before 2,000,000 = threshold at -1,600,000 ms
    effectiveGraceHours: 12,
  };

  it('returns PERMANENT when expiresAt is null and not closed', () => {
    const permanentGroup = { ...baseGroup, expiresAt: null, graceEndsAt: null };
    expect(getGroupStatus(permanentGroup, 5000000)).toBe('PERMANENT');
  });

  it('returns CLOSED when markedClosedAt is set, regardless of timestamps', () => {
    const closedGroup = { ...baseGroup, markedClosedAt: 1500000 };
    expect(getGroupStatus(closedGroup, 500000)).toBe('CLOSED');
    expect(getGroupStatus(closedGroup, 2000000)).toBe('CLOSED');
    expect(getGroupStatus(closedGroup, 3000000)).toBe('CLOSED');
  });

  it('returns ACTIVE when before the reminder threshold', () => {
    // expiresAt = 2,000,000; reminder = 10 mins (600,000 ms) -> threshold = 1,400,000
    const group = { ...baseGroup, effectiveReminderMinutes: 10 };
    expect(getGroupStatus(group, 1000000)).toBe('ACTIVE');
    expect(getGroupStatus(group, 1399999)).toBe('ACTIVE');
  });

  it('returns EXPIRING_SOON when within the reminder threshold', () => {
    const group = { ...baseGroup, effectiveReminderMinutes: 10 };
    // Threshold is 1,400,000
    expect(getGroupStatus(group, 1400000)).toBe('EXPIRING_SOON');
    expect(getGroupStatus(group, 1999999)).toBe('EXPIRING_SOON');
  });

  it('returns GRACE_PERIOD when past expiresAt but before graceEndsAt', () => {
    expect(getGroupStatus(baseGroup, 2000000)).toBe('GRACE_PERIOD');
    expect(getGroupStatus(baseGroup, 2499999)).toBe('GRACE_PERIOD');
  });

  it('returns EXPIRED when past graceEndsAt', () => {
    expect(getGroupStatus(baseGroup, 2500000)).toBe('EXPIRED');
    expect(getGroupStatus(baseGroup, 3000000)).toBe('EXPIRED');
  });

  it('returns EXPIRED immediately when expiresAt is reached and graceEndsAt is null', () => {
    const noGraceGroup = { ...baseGroup, graceEndsAt: null };
    expect(getGroupStatus(noGraceGroup, 1999999)).toBe('EXPIRING_SOON');
    expect(getGroupStatus(noGraceGroup, 2000000)).toBe('EXPIRED');
  });

  it('demonstrates monotonic status transitions over continuous time', () => {
    const timeline = [
      { time: 1000000, expected: 'ACTIVE' },
      { time: 1500000, expected: 'EXPIRING_SOON' },
      { time: 2000000, expected: 'GRACE_PERIOD' },
      { time: 2500000, expected: 'EXPIRED' },
      { time: 3000000, expected: 'EXPIRED' },
    ];

    const group = {
      ...baseGroup,
      expiresAt: 2000000,
      graceEndsAt: 2500000,
      effectiveReminderMinutes: (2000000 - 1500000) / (60 * 1000), // exactly 1,500,000 threshold
    };

    for (const step of timeline) {
      expect(getGroupStatus(group, step.time)).toBe(step.expected);
    }
  });
});

