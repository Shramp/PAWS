import { type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'paws.db';

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS trackers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  shape TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  for_date TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_daily_entries_tracker_date ON daily_entries(tracker_id, for_date);
CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(for_date);

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

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER,
  completion_note TEXT
);
`;

const SEED_TRACKERS: { name: string; shape: string; config: object }[] = [
  {
    name: 'Sleep',
    shape: 'measure',
    config: {
      valueLabel: 'Hours slept',
      valueUnit: 'h',
      ratingOptions: ['poor', 'fair', 'good', 'great'],
    },
  },
  {
    name: 'Exercise',
    shape: 'multi_pick',
    config: { options: ['climb', 'walk', 'dance'], allowCustom: true },
  },
  { name: 'Stretch', shape: 'bool', config: {} },
  { name: 'Play with cats', shape: 'bool', config: {} },
  { name: 'Left the house', shape: 'bool', config: {} },
  {
    name: 'How was the day?',
    shape: 'scale',
    config: { options: ['terrible', 'bad', 'meh', 'fine', 'good', 'great', 'amazing'] },
  },
];

export async function initDb(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V1);
      for (let i = 0; i < SEED_TRACKERS.length; i++) {
        const t = SEED_TRACKERS[i];
        await db.runAsync(
          'INSERT INTO trackers (name, shape, config, sort_order) VALUES (?, ?, ?, ?)',
          t.name,
          t.shape,
          JSON.stringify(t.config),
          i,
        );
      }
      await db.execAsync('PRAGMA user_version = 1');
    });
  }
}
