/**
 * Native Notification Dispatcher & Toolbar Badge Synchronizer
 * Deterministic notification IDs, max 2 buttons, action handlers, and badge counters.
 */

import { GroupEntity, DueMilestone } from '../core/types';
import { getGroupStatus } from '../core/status';

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  buttons?: chrome.notifications.ButtonOptions[];
}

/**
 * Creates deterministic notification ID
 */
export function createNotificationId(
  groupId: string,
  milestone: string,
  targetMs: number
): string {
  return `vilaya:${groupId}:${milestone}:${targetMs}`;
}

/**
 * Parses notification ID into metadata components
 */
export function parseNotificationId(id: string): {
  groupId: string;
  milestone: string;
  targetMs: number;
} | null {
  if (!id.startsWith('vilaya:')) return null;
  const parts = id.split(':');
  if (parts.length < 4) return null;
  return {
    groupId: parts[1],
    milestone: parts[2],
    targetMs: parseInt(parts[3], 10),
  };
}

/**
 * Dispatches a native browser notification
 */
export async function dispatchNativeNotification(
  payload: NotificationPayload
): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.notifications) return;

  const options: chrome.notifications.NotificationOptions = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: payload.title,
    message: payload.message,
    priority: 2,
    requireInteraction: true,
  };

  if (payload.buttons && payload.buttons.length > 0) {
    // Chrome allows up to 2 action buttons
    options.buttons = payload.buttons.slice(0, 2);
  }

  return new Promise((resolve) => {
    chrome.notifications.create(payload.id, options, () => {
      resolve();
    });
  });
}

/**
 * Dispatches single milestone notification
 */
export async function dispatchSingleMilestoneNotification(
  milestone: DueMilestone
): Promise<void> {
  let title = 'VILAYA Group Reminder';
  let message = `"${milestone.groupName}" requires your attention.`;

  if (milestone.milestone === 'REMINDER') {
    title = `⏳ Expiring Soon: ${milestone.groupName}`;
    message = `"${milestone.groupName}" is approaching its scheduled endpoint. Tap to extend or begin assisted closure.`;
  } else if (milestone.milestone === 'EXPIRY') {
    title = `🏁 Endpoint Reached: ${milestone.groupName}`;
    message = `"${milestone.groupName}" has concluded its purpose. Tap to copy closure message and mark closed.`;
  } else if (milestone.milestone === 'GRACE_END') {
    title = `⚠️ Grace Period Concluded: ${milestone.groupName}`;
    message = `"${milestone.groupName}" has reached the end of its grace period.`;
  }

  const notificationId = createNotificationId(
    milestone.groupId,
    milestone.milestone,
    milestone.targetMs
  );

  await dispatchNativeNotification({
    id: notificationId,
    title,
    message,
    buttons: [
      { title: 'Extend +24h' },
      { title: 'Open VILAYA' },
    ],
  });
}

/**
 * Dispatches one consolidated notification when 2+ distinct groups are overdue
 */
export async function dispatchConsolidatedOverdueNotification(
  distinctCount: number,
  now: number
): Promise<void> {
  await dispatchNativeNotification({
    id: `vilaya:consolidated:${now}`,
    title: 'VILAYA: Groups Awaiting Closure',
    message: `${distinctCount} groups reached their endpoint while you were away. Open VILAYA to review notes and assist closure.`,
    buttons: [
      { title: 'Open VILAYA' },
    ],
  });
}

/**
 * Updates toolbar badge with number of groups needing attention
 */
export function updateToolbarBadge(
  groups: Record<string, GroupEntity>,
  now: number
): void {
  if (typeof chrome === 'undefined' || !chrome.action) return;

  let attentionCount = 0;
  let hasExpired = false;

  for (const group of Object.values(groups)) {
    const status = getGroupStatus(group, now);
    if (status === 'EXPIRED' || status === 'GRACE_PERIOD') {
      attentionCount++;
      hasExpired = true;
    } else if (status === 'EXPIRING_SOON') {
      attentionCount++;
    }
  }

  if (attentionCount > 0) {
    chrome.action.setBadgeText({ text: String(attentionCount) });
    // Red/Gold indicator for attention
    chrome.action.setBadgeBackgroundColor({
      color: hasExpired ? '#8B2500' : '#C5A059',
    });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

