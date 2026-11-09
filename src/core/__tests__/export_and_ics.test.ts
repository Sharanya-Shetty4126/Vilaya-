import { describe, it, expect } from 'vitest';
import { createExportEnvelope, validateImportEnvelope } from '../export';
import { generateIcsCalendar } from '../ics';
import { VilayaStorage, GroupEntity } from '../types';

describe('Export Envelope & Import Validation', () => {
  const dummyStorage: VilayaStorage = {
    schemaVersion: 1,
    groups: {
      'g-1': {
        id: 'g-1',
        name: 'College Hackathon',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        expiresAt: 1700100000000,
        graceEndsAt: 1700150000000,
        markedClosedAt: null,
        effectiveReminderMinutes: 120,
        effectiveGraceHours: 12,
      },
    },
    settings: {
      defaultReminderMinutes: 120,
      defaultGraceHours: 12,
      notifyOnExpired: true,
      notifyOnReminder: true,
      themePreference: 'system',
    },
    notificationState: {},
    meta: {
      lastSuccessfulReconcileAt: 1700000000000,
      catchUpDismissedAt: null,
    },
  };

  it('creates a clean export envelope excluding internal delivery state and metadata', () => {
    const envelope = createExportEnvelope(dummyStorage, 1700050000000);
    expect(envelope.app).toBe('vilaya');
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.exportedAt).toBe(1700050000000);
    expect(envelope.groups['g-1'].name).toBe('College Hackathon');
    // Internal fields not in envelope
    expect((envelope as any).notificationState).toBeUndefined();
    expect((envelope as any).meta).toBeUndefined();
  });

  it('validates a valid export envelope successfully', () => {
    const envelope = createExportEnvelope(dummyStorage, 1700050000000);
    const res = validateImportEnvelope(envelope);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.envelope).toBeDefined();
  });

  it('rejects an envelope with an invalid application identifier', () => {
    const invalid = { app: 'other_app', schemaVersion: 1, exportedAt: 1000, groups: {}, settings: {} };
    const res = validateImportEnvelope(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Invalid application identifier'))).toBe(true);
  });

  it('rejects an unsupported schemaVersion', () => {
    const invalid = { app: 'vilaya', schemaVersion: 99, exportedAt: 1000, groups: {}, settings: {} };
    const res = validateImportEnvelope(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Unsupported schemaVersion'))).toBe(true);
  });
});

describe('RFC 5545 iCalendar (.ics) Generator', () => {
  const group: GroupEntity = {
    id: 'grp-ics-test',
    name: 'Trip to Ooty',
    purpose: 'Vacation Planning',
    notes: 'Hotel booked at Sterling',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    expiresAt: 1700500000000,
    graceEndsAt: null,
    markedClosedAt: null,
    effectiveReminderMinutes: 60,
    effectiveGraceHours: 0,
  };

  it('generates valid RFC 5545 calendar text with VEVENT and VALARM', () => {
    const ics = generateIcsCalendar(group, 1700000000000);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:[VILAYA] Expiry: Trip to Ooty');
    expect(ics).toContain('TRIGGER:-PT60M');
    expect(ics).toContain('ACTION:DISPLAY');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('throws an error if attempting to generate .ics for a permanent group', () => {
    const permanentGroup = { ...group, expiresAt: null };
    expect(() => generateIcsCalendar(permanentGroup, 1700000000000)).toThrow(
      'Cannot export calendar reminder for a permanent group'
    );
  });
});

