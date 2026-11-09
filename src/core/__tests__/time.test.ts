import { describe, it, expect } from 'vitest';
import { getEndOfLocalDay, calculateExtension, getRemainingParts, formatCountdown } from '../time';
import { GroupEntity } from '../types';

describe('Pure time utilities', () => {
  it('getEndOfLocalDay returns 23:59:59.999 using local calendar components', () => {
    const base = new Date(2026, 10, 9, 14, 30, 0); // Nov 9, 2026
    const endToday = getEndOfLocalDay(0, base);
    const dateToday = new Date(endToday);

    expect(dateToday.getFullYear()).toBe(2026);
    expect(dateToday.getMonth()).toBe(10);
    expect(dateToday.getDate()).toBe(9);
    expect(dateToday.getHours()).toBe(23);
    expect(dateToday.getMinutes()).toBe(59);
    expect(dateToday.getSeconds()).toBe(59);
    expect(dateToday.getMilliseconds()).toBe(999);
  });

  it('getEndOfLocalDay handles leap day transitions properly', () => {
    // Feb 28 on a leap year (2028)
    const feb28 = new Date(2028, 1, 28, 10, 0, 0);
    const endTomorrow = getEndOfLocalDay(1, feb28);
    const dateTomorrow = new Date(endTomorrow);

    expect(dateTomorrow.getFullYear()).toBe(2028);
    expect(dateTomorrow.getMonth()).toBe(1); // February
    expect(dateTomorrow.getDate()).toBe(29); // Leap day!
    expect(dateTomorrow.getHours()).toBe(23);
    expect(dateTomorrow.getMinutes()).toBe(59);
  });

  it('getEndOfLocalDay handles month and year roll-over', () => {
    const dec31 = new Date(2026, 11, 31, 10, 0, 0);
    const endNextDay = getEndOfLocalDay(1, dec31);
    const dateNextDay = new Date(endNextDay);

    expect(dateNextDay.getFullYear()).toBe(2027);
    expect(dateNextDay.getMonth()).toBe(0); // January
    expect(dateNextDay.getDate()).toBe(1);
    expect(dateNextDay.getHours()).toBe(23);
  });

  describe('calculateExtension semantics', () => {
    const activeGroup: GroupEntity = {
      id: 'grp-ext',
      name: 'Event',
      createdAt: 1000,
      updatedAt: 1000,
      expiresAt: 10000,
      graceEndsAt: 15000,
      markedClosedAt: null,
      effectiveReminderMinutes: 60,
      effectiveGraceHours: 2, // 2h = 7,200,000 ms
    };

    it('extends from expiresAt if the group is still ACTIVE', () => {
      const now = 5000; // active
      const delta = 10000;
      const res = calculateExtension(activeGroup, delta, now);

      expect(res.expiresAt).toBe(20000); // 10000 + 10000
      expect(res.graceEndsAt).toBe(20000 + 2 * 3600 * 1000);
    });

    it('extends from now if the group is already EXPIRED or in GRACE_PERIOD', () => {
      const now = 12000; // in grace period
      const delta = 5000;
      const res = calculateExtension(activeGroup, delta, now);

      expect(res.expiresAt).toBe(17000); // 12000 + 5000
      expect(res.graceEndsAt).toBe(17000 + 2 * 3600 * 1000);
    });

    it('throws when trying to extend a markedClosed group', () => {
      const closed = { ...activeGroup, markedClosedAt: 9000 };
      expect(() => calculateExtension(closed, 1000, 12000)).toThrow('Closed groups cannot be extended');
    });

    it('throws when delta is non-positive', () => {
      expect(() => calculateExtension(activeGroup, 0, 5000)).toThrow('Extension duration must be positive');
      expect(() => calculateExtension(activeGroup, -100, 5000)).toThrow('Extension duration must be positive');
    });
  });

  describe('formatCountdown', () => {
    it('formats days, hours, minutes accurately', () => {
      const now = 1000;
      expect(formatCountdown(now + 2 * 86400000 + 3 * 3600000, now)).toBe('2d 3h');
      expect(formatCountdown(now + 4 * 3600000 + 15 * 60000, now)).toBe('4h 15m');
      expect(formatCountdown(now + 5 * 60000 + 30 * 1000, now)).toBe('5m 30s');
      expect(formatCountdown(now + 12 * 1000, now)).toBe('12s');
      expect(formatCountdown(now - 100, now)).toBe('0s');
    });
  });
});

