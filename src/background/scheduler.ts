/**
 * Centralized Alarm Scheduler
 * Manages the single 'vilaya-next' milestone alarm and 6-hour heartbeat alarm.
 */

import { VilayaStorage } from '../core/types';
import { computeDueMilestones } from '../core/milestones';

export const ALARM_NEXT = 'vilaya-next';
export const ALARM_HEARTBEAT = 'vilaya-heartbeat';
export const HEARTBEAT_INTERVAL_MINUTES = 360; // 6 hours

/**
 * Ensures the 6-hour periodic heartbeat alarm is registered
 */
export async function ensureHeartbeatAlarm(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;

  const existing = await chrome.alarms.get(ALARM_HEARTBEAT);
  if (!existing) {
    chrome.alarms.create(ALARM_HEARTBEAT, {
      periodInMinutes: HEARTBEAT_INTERVAL_MINUTES,
    });
  }
}

/**
 * Recalculates and sets the 'vilaya-next' alarm to the earliest upcoming milestone
 */
export async function rescheduleNextMilestoneAlarm(
  storage: VilayaStorage,
  now: number
): Promise<number | null> {
  if (typeof chrome === 'undefined' || !chrome.alarms) return null;

  try {
    const { nextMilestoneMs } = computeDueMilestones(
      storage.groups,
      storage.notificationState,
      now
    );

    if (nextMilestoneMs !== null && nextMilestoneMs > now) {
      chrome.alarms.create(ALARM_NEXT, { when: nextMilestoneMs });
      return nextMilestoneMs;
    } else {
      await chrome.alarms.clear(ALARM_NEXT);
      return null;
    }
  } catch (err) {
    console.error('[VILAYA SCHEDULER] Failed to reschedule next milestone alarm:', err);
    return null;
  }
}

