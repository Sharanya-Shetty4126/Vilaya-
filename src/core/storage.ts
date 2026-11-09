/**
 * Storage Repository & Security Manager
 * Manifest V3 TRUSTED_CONTEXTS, fail-closed security guarantee,
 * serialized mutation queue, and schemaVersion: 1 integrity.
 */

import {
  VilayaStorage,
  GroupEntity,
  VilayaSettings,
  GroupNotificationState,
  VilayaMeta,
  ClosureChecklist,
} from './types';
import { calculateExtension } from './time';

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: VilayaSettings = {
  defaultReminderMinutes: 120, // 2 hours before expiry
  defaultGraceHours: 12,        // 12 hours grace buffer
  notifyOnExpired: true,
  notifyOnReminder: true,
  themePreference: 'system',
};

export const INITIAL_STORAGE: VilayaStorage = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  groups: {},
  settings: DEFAULT_SETTINGS,
  notificationState: {},
  meta: {
    lastSuccessfulReconcileAt: 0,
    catchUpDismissedAt: null,
  },
};

export class SecurityInitializationError extends Error {
  constructor(message: string) {
    super(`[VILAYA SECURITY ERROR] ${message}`);
    this.name = 'SecurityInitializationError';
  }
}

let isQuarantined = false;
let quarantineReason = '';
let securityInitPromise: Promise<void> | null = null;

/**
 * Initializes TRUSTED_CONTEXTS on chrome.storage.local.
 * Must fail-closed: if access level cannot be established, subsequent operations reject.
 */
export function initializeStorageSecurity(): Promise<void> {
  if (securityInitPromise) return securityInitPromise;

  securityInitPromise = (async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // storage.local allows content scripts by default unless restricted
        if (typeof chrome.storage.local.setAccessLevel === 'function') {
          await chrome.storage.local.setAccessLevel({
            accessLevel: 'TRUSTED_CONTEXTS',
          });
          // Storage successfully restricted to extension service workers and UI pages
        }
      }
    } catch (err: unknown) {
      isQuarantined = true;
      quarantineReason = err instanceof Error ? err.message : String(err);
      console.error('[VILAYA CRITICAL] Storage security initialization failed:', quarantineReason);
      throw new SecurityInitializationError(
        `Failed to set TRUSTED_CONTEXTS. Storage quarantined: ${quarantineReason}`
      );
    }
  })();

  return securityInitPromise;
}

/**
 * Asserts security boundary before servicing any storage request
 */
async function assertSecurity(): Promise<void> {
  if (isQuarantined) {
    throw new SecurityInitializationError(`Storage is quarantined: ${quarantineReason}`);
  }
  if (securityInitPromise) {
    await securityInitPromise;
  }
}

/**
 * Serialized Promise Queue to prevent write race conditions
 */
class SerializedQueue {
  private queue: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      await assertSecurity();
      return task();
    });
    this.queue = next.catch(() => {});
    return next;
  }
}

const storageQueue = new SerializedQueue();

/**
 * Low-level read with schema integrity check
 */
async function rawGetStorage(): Promise<VilayaStorage> {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    // Return initial storage in non-extension environments (e.g. testing)
    return { ...INITIAL_STORAGE };
  }

  const result = await chrome.storage.local.get(null);
  if (!result || Object.keys(result).length === 0 || !result.schemaVersion) {
    // Uninitialized storage: write defaults
    await chrome.storage.local.set(INITIAL_STORAGE);
    return { ...INITIAL_STORAGE };
  }

  // Schema version validation & forward migration hook
  if (result.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported storage schema version (${result.schemaVersion}). Please update VILAYA.`
    );
  }

  return {
    schemaVersion: result.schemaVersion || CURRENT_SCHEMA_VERSION,
    groups: result.groups || {},
    settings: { ...DEFAULT_SETTINGS, ...(result.settings || {}) },
    notificationState: result.notificationState || {},
    meta: {
      lastSuccessfulReconcileAt: result.meta?.lastSuccessfulReconcileAt ?? 0,
      catchUpDismissedAt: result.meta?.catchUpDismissedAt ?? null,
    },
  };
}

/**
 * Low-level write
 */
async function rawSetStorage(data: Partial<VilayaStorage>): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }
  await chrome.storage.local.set(data);
}

/**
 * Read current storage state
 */
export function getStorage(): Promise<VilayaStorage> {
  return storageQueue.enqueue(async () => {
    return rawGetStorage();
  });
}

/**
 * Atomically create or update a group record
 */
export function saveGroup(group: GroupEntity): Promise<void> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    const updatedGroups = {
      ...storage.groups,
      [group.id]: {
        ...group,
        updatedAt: Date.now(),
      },
    };
    await rawSetStorage({ groups: updatedGroups });
  });
}

/**
 * Atomically extend group lifetime with explicit semantics
 */
export function extendGroup(
  groupId: string,
  deltaMs: number,
  now: number
): Promise<GroupEntity> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    const group = storage.groups[groupId];
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const { expiresAt, graceEndsAt } = calculateExtension(group, deltaMs, now);

    const updatedGroup: GroupEntity = {
      ...group,
      expiresAt,
      graceEndsAt,
      updatedAt: now,
    };

    // Prune existing notifications for this group since targetMs changed
    const updatedNotifState = { ...storage.notificationState };
    delete updatedNotifState[groupId];

    await rawSetStorage({
      groups: {
        ...storage.groups,
        [groupId]: updatedGroup,
      },
      notificationState: updatedNotifState,
    });

    return updatedGroup;
  });
}

/**
 * Mark group closed with explicit confirmation ("marked by you")
 */
export function markClosed(
  groupId: string,
  now: number,
  checklist?: ClosureChecklist
): Promise<void> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    const group = storage.groups[groupId];
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const updatedGroup: GroupEntity = {
      ...group,
      markedClosedAt: now,
      updatedAt: now,
      closureChecklist: checklist ?? group.closureChecklist,
    };

    // Clean up active notification state
    const updatedNotifState = { ...storage.notificationState };
    delete updatedNotifState[groupId];

    await rawSetStorage({
      groups: {
        ...storage.groups,
        [groupId]: updatedGroup,
      },
      notificationState: updatedNotifState,
    });
  });
}

/**
 * Reopen a previously closed group
 */
export function reopenGroup(groupId: string, now: number): Promise<void> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    const group = storage.groups[groupId];
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const updatedGroup: GroupEntity = {
      ...group,
      markedClosedAt: null,
      updatedAt: now,
    };

    await rawSetStorage({
      groups: {
        ...storage.groups,
        [groupId]: updatedGroup,
      },
    });
  });
}

/**
 * Delete a group record completely
 */
export function deleteGroup(groupId: string): Promise<void> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    const updatedGroups = { ...storage.groups };
    delete updatedGroups[groupId];

    const updatedNotifState = { ...storage.notificationState };
    delete updatedNotifState[groupId];

    await rawSetStorage({
      groups: updatedGroups,
      notificationState: updatedNotifState,
    });
  });
}

/**
 * Update global default settings
 */
export function updateSettings(settings: Partial<VilayaSettings>): Promise<void> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    await rawSetStorage({
      settings: {
        ...storage.settings,
        ...settings,
      },
    });
  });
}

/**
 * Update delivery states for milestones
 */
export function updateNotificationMarkers(
  markers: Array<{
    groupId: string;
    milestone: 'reminder' | 'expiry' | 'graceEnd';
    targetMs: number;
    deliveredAt: number;
  }>
): Promise<void> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    const notifState = { ...storage.notificationState };

    for (const marker of markers) {
      if (!notifState[marker.groupId]) {
        notifState[marker.groupId] = {};
      }
      notifState[marker.groupId][marker.milestone] = {
        targetMs: marker.targetMs,
        status: 'DELIVERED',
        deliveredAt: marker.deliveredAt,
      };
    }

    await rawSetStorage({ notificationState: notifState });
  });
}

/**
 * Update application metadata
 */
export function updateMeta(meta: Partial<VilayaMeta>): Promise<void> {
  return storageQueue.enqueue(async () => {
    const storage = await rawGetStorage();
    await rawSetStorage({
      meta: {
        ...storage.meta,
        ...meta,
      },
    });
  });
}

/**
 * Reactive Storage Listener
 * Subscribes to chrome.storage.onChanged to keep UI surfaces instantly in sync
 */
export function subscribeToStorageChanges(
  callback: (newStorage: VilayaStorage) => void
): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
    return () => {};
  }

  const listener = (
    _changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'local') {
      getStorage().then(callback).catch(console.error);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

