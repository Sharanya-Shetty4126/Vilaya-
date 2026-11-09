/**
 * VILAYA (विलयः) Core Type Definitions
 * Strict Manifest V3 & Platform-Independent (Zero chrome.* imports)
 */

export type GroupStatus = 
  | 'CLOSED'          // markedClosedAt !== null
  | 'PERMANENT'       // expiresAt === null
  | 'EXPIRED'         // now >= (graceEndsAt ?? expiresAt)
  | 'GRACE_PERIOD'    // expiresAt !== null && now >= expiresAt && graceEndsAt !== null && now < graceEndsAt
  | 'EXPIRING_SOON'   // expiresAt !== null && now >= (expiresAt - reminderLeadMs) && now < expiresAt
  | 'ACTIVE';         // now < (expiresAt - reminderLeadMs)

export type MilestoneType = 'REMINDER' | 'EXPIRY' | 'GRACE_END';

export interface ClosureChecklist {
  announcementCopied?: boolean;
  chatOpened?: boolean;
}

export interface GroupEntity {
  id: string;                         // crypto.randomUUID()
  name: string;                       // Group name (sanitized, max 100 chars)
  purpose?: string;                   // Tag / Category (max 50 chars)
  notes?: string;                     // Optional notes (max 500 chars)
  
  // Timestamps (Integer UTC Epoch Milliseconds)
  createdAt: number;
  updatedAt: number;                  // Timestamp of last edit or extension
  expiresAt: number | null;           // null = Permanent ("Never")
  graceEndsAt: number | null;         // null = No grace period
  markedClosedAt: number | null;      // null = Open, number = Confirmed closed in VILAYA
  
  // Effective settings snapshotted at creation
  effectiveReminderMinutes: number;   // Default: 120 (2 hours before)
  effectiveGraceHours: number;        // Default: 12 (or 0 for none)
  
  // Self-reported closure checklist ("marked by you")
  closureChecklist?: ClosureChecklist;
}

export interface NotificationRecord {
  targetMs: number;
  status: 'PENDING' | 'DELIVERED';
  deliveredAt: number;
}

export interface GroupNotificationState {
  reminder?: NotificationRecord;
  expiry?: NotificationRecord;
  graceEnd?: NotificationRecord;
}

export interface VilayaSettings {
  defaultReminderMinutes: number;     // Default: 120 (2h before)
  defaultGraceHours: number;           // Default: 12
  notifyOnExpired: boolean;
  notifyOnReminder: boolean;
  themePreference: 'system' | 'light' | 'dark';
}

export interface VilayaMeta {
  lastSuccessfulReconcileAt: number;
  catchUpDismissedAt: number | null;
}

export interface VilayaStorage {
  schemaVersion: number;              // 1
  groups: Record<string, GroupEntity>;
  settings: VilayaSettings;
  notificationState: Record<string, GroupNotificationState>;
  meta: VilayaMeta;
}

export interface DueMilestone {
  groupId: string;
  groupName: string;
  milestone: MilestoneType;
  targetMs: number;
  overdueByMs: number;
}

export interface ObsoleteMilestone {
  groupId: string;
  milestone: MilestoneType;
  targetMs: number;
}

export interface ReconcileCalculationResult {
  dueMilestones: DueMilestone[];
  obsoleteMilestones: ObsoleteMilestone[];
  distinctOverdueGroupsCount: number;
  nextMilestoneMs: number | null;
}

export interface ExportEnvelope {
  app: 'vilaya';
  schemaVersion: number;
  exportedAt: number;
  groups: Record<string, GroupEntity>;
  settings: VilayaSettings;
}

