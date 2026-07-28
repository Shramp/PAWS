import { type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'paws.db';

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS substances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  routes TEXT NOT NULL DEFAULT '[]',
  daily_total_only INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  substance_id INTEGER NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
  for_date TEXT NOT NULL,
  timestamp_ms INTEGER,
  amount REAL NOT NULL,
  route TEXT
);
CREATE INDEX IF NOT EXISTS idx_usage_events_date ON usage_events(for_date);
CREATE INDEX IF NOT EXISTS idx_usage_events_substance_date ON usage_events(substance_id, for_date);
`;

export async function initDb(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V1);
      await db.execAsync('PRAGMA user_version = 1');
    });
  }
}
