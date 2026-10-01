import { FragranceData, toFragranceData, withLine } from './fragrance.model';

// JSON backup file: the whole list plus enough metadata to evolve the format later.

const BACKUP_APP = 'fragrance-collection';
/** 2 added `line` to items; version 1 files are still read. */
const BACKUP_VERSION = 2;

interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  items: FragranceData[];
}

export type BackupReadResult =
  | { ok: true; items: FragranceData[] }
  | { ok: false; error: string };

export function createBackup(items: readonly FragranceData[], now: Date = new Date()): string {
  const backup: Backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    items: items.map(({ name, status, grandmaStatus, line }) => ({
      name,
      status,
      grandmaStatus,
      ...withLine(line),
    })),
  };
  return JSON.stringify(backup, null, 2);
}

/** `fragrances-YYYY-MM-DD.json`, using the local date. */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `fragrances-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Reads a backup file. A bare array (e.g. a copy of the localStorage value) is accepted too.
 * Entries are repaired the same way as stored data; entries without a name are dropped.
 */
export function readBackup(text: string): BackupReadResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }

  const record = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const rawItems = Array.isArray(value) ? value : record?.['items'];
  if (!Array.isArray(rawItems)) {
    return { ok: false, error: 'This file is not a fragrance backup.' };
  }

  const version = record?.['version'];
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app.' };
  }

  const items = rawItems.map(toFragranceData).filter((item) => item !== null);
  if (items.length === 0) {
    return { ok: false, error: 'No fragrances found in this file.' };
  }

  return { ok: true, items };
}
