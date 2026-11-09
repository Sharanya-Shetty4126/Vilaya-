/**
 * Central Reconciler & Offline Catch-up Engine
 * Deterministic recovery, obsolete suppression, single consolidated alert,
 * and fail-safe lastSuccessfulReconcileAt ordering.
 */

import {
  getStorage,
  updateNotificationMarkers,
  updateMeta,
} from '../core/storage';
import { computeDueMilestones } from '../core/milestones';
import {
  dispatchSingleMilestoneNotification,
  dispatchConsolidatedOverdueNotification,
  updateToolbarBadge,
} from './notifications';
import { rescheduleNextMilestoneAlarm } from './scheduler';

let isReconciling = false;

/**
 * Executes a full reconciliation pass
 */
export async function reconcile(): Promise<void> {
  if (isReconciling) return;
  isReconciling = true;

  try {
    const storage = await getStorage();
    const now = Date.now();

    // 1. Clock Jump Handling: If system clock moved backward, do not throw.
    if (now < storage.meta.lastSuccessfulReconcileAt) {
      console.warn('[VILAYA RECONCILE] Clock moved backward. Resetting reconcile baseline.');
    }

    // 2. Pure milestone & obsolete calculation
    const {
      dueMilestones,
      obsoleteMilestones,
      distinctOverdueGroupsCount,
    } = computeDueMilestones(storage.groups, storage.notificationState, now);

    const markersToWrite: Array<{
      groupId: string;
      milestone: 'reminder' | 'expiry' | 'graceEnd';
      targetMs: number;
      deliveredAt: number;
    }> = [];

    // 3. Mark obsolete milestones acknowledged so they never re-trigger
    for (const obs of obsoleteMilestones) {
      const field = obs.milestone === 'REMINDER' ? 'reminder' : 'expiry';
      markersToWrite.push({
        groupId: obs.groupId,
        milestone: field,
        targetMs: obs.targetMs,
        deliveredAt: now,
      });
    }

    // 4. Dispatch notifications based on distinct group count
    if (distinctOverdueGroupsCount >= 2) {
      // Overdue catch-up: dispatch ONE consolidated notification
      await dispatchConsolidatedOverdueNotification(distinctOverdueGroupsCount, now);

      for (const due of dueMilestones) {
        const field =
          due.milestone === 'REMINDER'
            ? 'reminder'
            : due.milestone === 'EXPIRY'
            ? 'expiry'
            : 'graceEnd';
        markersToWrite.push({
          groupId: due.groupId,
          milestone: field,
          targetMs: due.targetMs,
          deliveredAt: now,
        });
      }
    } else if (distinctOverdueGroupsCount === 1 && dueMilestones.length > 0) {
      // Single group notification
      const primaryDue = dueMilestones[0];
      const shouldNotify =
        primaryDue.milestone === 'REMINDER'
          ? storage.settings.notifyOnReminder
          : storage.settings.notifyOnExpired;

      if (shouldNotify) {
        await dispatchSingleMilestoneNotification(primaryDue);
      }

      const field =
        primaryDue.milestone === 'REMINDER'
          ? 'reminder'
          : primaryDue.milestone === 'EXPIRY'
          ? 'expiry'
          : 'graceEnd';
      markersToWrite.push({
        groupId: primaryDue.groupId,
        milestone: field,
        targetMs: primaryDue.targetMs,
        deliveredAt: now,
      });
    }

    // 5. Write markers to storage
    if (markersToWrite.length > 0) {
      await updateNotificationMarkers(markersToWrite);
    }

    // 6. Reschedule next milestone alarm
    const freshStorage = await getStorage();
    await rescheduleNextMilestoneAlarm(freshStorage, now);

    // 7. Update toolbar badge
    updateToolbarBadge(freshStorage.groups, now);

    // 8. LAST: Advance lastSuccessfulReconcileAt only after all prior steps succeed
    await updateMeta({ lastSuccessfulReconcileAt: now });
  } catch (err) {
    console.error('[VILAYA RECONCILE] Error during reconciliation:', err);
    // Do NOT advance lastSuccessfulReconcileAt if any step threw
  } finally {
    isReconciling = false;
  }
}

