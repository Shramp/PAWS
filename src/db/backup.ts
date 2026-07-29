import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Backup format: raw table rows plus header. Kept lossless (ids included) so
 * a restore onto a fresh install reproduces the database exactly.
 */
export interface BackupFile {
  app: 'paws';
  schemaVersion: number;
  exportedAt: string;
  substances: Record<string, unknown>[];
  usage_events: Record<string, unknown>[];
  confirmed_days: Record<string, unknown>[];
}

export async function exportBackup(db: SQLiteDatabase): Promise<string> {
  const [substances, usageEvents, confirmedDays, versionRow] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM substances'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM usage_events'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM confirmed_days'),
    db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'),
  ]);

  const backup: BackupFile = {
    app: 'paws',
    schemaVersion: versionRow?.user_version ?? 0,
    exportedAt: new Date().toISOString(),
    substances,
    usage_events: usageEvents,
    confirmed_days: confirmedDays,
  };
  return JSON.stringify(backup, null, 2);
}

/** Parse and sanity-check a backup file; throws with a readable message. */
export function parseBackup(json: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const backup = data as Partial<BackupFile>;
  if (backup.app !== 'paws') {
    throw new Error('That file does not look like a PAWS backup.');
  }
  if (typeof backup.schemaVersion !== 'number' || backup.schemaVersion > 2) {
    throw new Error(
      'This backup was made by a newer version of PAWS — update the app before importing it.',
    );
  }
  for (const table of ['substances', 'usage_events'] as const) {
    if (!Array.isArray(backup[table])) {
      throw new Error(`Backup is missing the ${table} table.`);
    }
  }
  return { ...backup, confirmed_days: backup.confirmed_days ?? [] } as BackupFile;
}

function insertSql(table: string, row: Record<string, unknown>): [string, unknown[]] {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  return [
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    columns.map((c) => row[c] as never),
  ];
}

/** REPLACES all current data with the backup's contents. */
export async function importBackup(
  db: SQLiteDatabase,
  backup: BackupFile,
): Promise<{ substances: number; events: number; days: number }> {
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM usage_events');
    await db.execAsync('DELETE FROM confirmed_days');
    await db.execAsync('DELETE FROM substances');
    for (const row of backup.substances) {
      const [sql, params] = insertSql('substances', row);
      await db.runAsync(sql, ...(params as never[]));
    }
    for (const row of backup.usage_events) {
      const [sql, params] = insertSql('usage_events', row);
      await db.runAsync(sql, ...(params as never[]));
    }
    for (const row of backup.confirmed_days) {
      const [sql, params] = insertSql('confirmed_days', row);
      await db.runAsync(sql, ...(params as never[]));
    }
  });
  return {
    substances: backup.substances.length,
    events: backup.usage_events.length,
    days: backup.confirmed_days.length,
  };
}
