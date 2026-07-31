import { type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'paws.db';

/**
 * items         — the things you take (name, unit, routes)
 * intake_events — one logged intake; timestamp_ms is null for daily-total items
 * confirmed_days — days explicitly affirmed as "nothing taken at all". A day
 *   counts as *tracked* if it has any intake event OR appears here; on tracked
 *   days the absence of an item means zero (from that item's first entry on),
 *   while untracked days are unknown.
 */
const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  routes TEXT NOT NULL DEFAULT '[]',
  daily_total_only INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- pre-filled in the log sheet when set; still editable per entry
  default_amount REAL
);

CREATE TABLE IF NOT EXISTS intake_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  for_date TEXT NOT NULL,
  timestamp_ms INTEGER,
  amount REAL NOT NULL,
  route TEXT
);
CREATE INDEX IF NOT EXISTS idx_intake_events_date ON intake_events(for_date);
CREATE INDEX IF NOT EXISTS idx_intake_events_item_date ON intake_events(item_id, for_date);

CREATE TABLE IF NOT EXISTS confirmed_days (
  for_date TEXT PRIMARY KEY
);
`;

/**
 * Tables that predate the July 2026 "substance" → "item" rename. A database
 * created before it carries user_version = 2 with entirely different table
 * names, so version alone can't tell us whether the current schema exists.
 */
const LEGACY_TABLES = ['substances', 'usage_events', 'trackers', 'daily_entries', 'todos'];

export async function initDb(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  // Create anything missing rather than gating on user_version: a pre-rename
  // database reports version 2 while lacking every table we now need.
  await db.withTransactionAsync(async () => {
    await db.execAsync(SCHEMA_V1);
    for (const table of LEGACY_TABLES) {
      await db.execAsync(`DROP TABLE IF EXISTS ${table}`);
    }
    await db.execAsync('PRAGMA user_version = 1');
  });
}
