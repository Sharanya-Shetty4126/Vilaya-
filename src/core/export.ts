/**
 * Backup Export Envelope & Validation
 * Platform-independent, zero chrome.* imports.
 */

import { ExportEnvelope, VilayaStorage, GroupEntity } from './types';

export function createExportEnvelope(storage: VilayaStorage, now: number): ExportEnvelope {
  return {
    app: 'vilaya',
    schemaVersion: storage.schemaVersion,
    exportedAt: now,
    groups: storage.groups,
    settings: storage.settings,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  envelope?: ExportEnvelope;
}

/**
 * Validates untrusted imported JSON before it touches any local storage.
 */
export function validateImportEnvelope(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Imported file is not a valid JSON object.'] };
  }

  const candidate = data as Partial<ExportEnvelope>;

  if (candidate.app !== 'vilaya') {
    errors.push('Invalid application identifier. File must originate from VILAYA.');
  }

  if (typeof candidate.schemaVersion !== 'number') {
    errors.push('Missing or invalid schemaVersion.');
  } else if (candidate.schemaVersion > 1) {
    errors.push(
      `Unsupported schemaVersion (${candidate.schemaVersion}). Please update VILAYA to import this file.`
    );
  }

  if (typeof candidate.exportedAt !== 'number' || isNaN(candidate.exportedAt)) {
    errors.push('Missing or invalid exportedAt timestamp.');
  }

  if (!candidate.groups || typeof candidate.groups !== 'object') {
    errors.push('Missing groups record in import envelope.');
  } else {
    const groupCount = Object.keys(candidate.groups).length;
    if (groupCount > 5000) {
      errors.push(`Group count exceeds limit (5000 max, found ${groupCount}).`);
    }

    const minTimestamp = new Date('2000-01-01').getTime();
    const maxTimestamp = new Date('2100-01-01').getTime();

    for (const [id, grp] of Object.entries(candidate.groups)) {
      const g = grp as Partial<GroupEntity>;
      if (!g || typeof g !== 'object') {
        errors.push(`Invalid group item at key "${id}".`);
        continue;
      }
      if (!g.id || typeof g.id !== 'string') {
        errors.push(`Group "${id}" is missing a valid id.`);
      }
      if (!g.name || typeof g.name !== 'string' || g.name.trim().length === 0) {
        errors.push(`Group "${id}" has an invalid or empty name.`);
      } else if (g.name.length > 100) {
        errors.push(`Group "${id}" name exceeds 100 characters.`);
      }
      if (typeof g.createdAt !== 'number' || g.createdAt < minTimestamp || g.createdAt > maxTimestamp) {
        errors.push(`Group "${id}" has an invalid createdAt timestamp.`);
      }
      if (g.expiresAt !== null && (typeof g.expiresAt !== 'number' || g.expiresAt < minTimestamp || g.expiresAt > maxTimestamp)) {
        errors.push(`Group "${id}" has an invalid expiresAt timestamp.`);
      }
      if (g.expiresAt !== null && typeof g.createdAt === 'number' && g.expiresAt < g.createdAt) {
        errors.push(`Group "${id}" expiresAt cannot be earlier than createdAt.`);
      }
    }
  }

  if (!candidate.settings || typeof candidate.settings !== 'object') {
    errors.push('Missing settings object in import envelope.');
  }

  return {
    valid: errors.length === 0,
    errors,
    envelope: errors.length === 0 ? (candidate as ExportEnvelope) : undefined,
  };
}

