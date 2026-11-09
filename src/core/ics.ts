/**
 * RFC 5545 Compliant iCalendar (.ics) Generator
 * Pure TypeScript, zero external dependencies, allows phone calendar sync.
 */

import { GroupEntity } from './types';

function formatIcsDate(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant .ics string for a group expiry reminder
 */
export function generateIcsCalendar(group: GroupEntity, now: number): string {
  if (group.expiresAt === null) {
    throw new Error('Cannot export calendar reminder for a permanent group.');
  }

  const dtStamp = formatIcsDate(now);
  const dtStart = formatIcsDate(group.expiresAt);
  // Default duration of event is 30 minutes for calendar view
  const dtEnd = formatIcsDate(group.expiresAt + 30 * 60 * 1000);
  const reminderMinutes = group.effectiveReminderMinutes ?? 120;

  const summary = escapeIcsText(`[VILAYA] Expiry: ${group.name}`);
  const description = escapeIcsText(
    `VILAYA Companion Expiry Reminder\n\n` +
    `Group: ${group.name}\n` +
    (group.purpose ? `Purpose: ${group.purpose}\n` : '') +
    (group.notes ? `Notes: ${group.notes}\n` : '') +
    `\nAssisted closure: Open WhatsApp Web and announce closure to group members.`
  );

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VILAYA//WhatsApp Group Companion//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:vilaya-${group.id}@vilaya.app`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    `TRIGGER:-PT${reminderMinutes}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

