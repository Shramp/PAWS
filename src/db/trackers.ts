import { type SQLiteDatabase } from 'expo-sqlite';

import { type DailyEntry, type Tracker, type TrackerConfig, type TrackerShape } from '@/db/types';

interface TrackerRow {
  id: number;
  name: string;
  shape: string;
  config: string;
  sort_order: number;
  archived: number;
}

function toTracker(row: TrackerRow): Tracker {
  return {
    id: row.id,
    name: row.name,
    shape: row.shape as TrackerShape,
    config: JSON.parse(row.config) as TrackerConfig,
    sortOrder: row.sort_order,
    archived: row.archived === 1,
  };
}

export async function listTrackers(db: SQLiteDatabase, includeArchived = false): Promise<Tracker[]> {
  const rows = await db.getAllAsync<TrackerRow>(
    includeArchived
      ? 'SELECT * FROM trackers ORDER BY archived, sort_order, id'
      : 'SELECT * FROM trackers WHERE archived = 0 ORDER BY sort_order, id',
  );
  return rows.map(toTracker);
}

export async function createTracker(
  db: SQLiteDatabase,
  name: string,
  shape: TrackerShape,
  config: TrackerConfig,
): Promise<number> {
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM trackers');
  const result = await db.runAsync(
    'INSERT INTO trackers (name, shape, config, sort_order) VALUES (?, ?, ?, ?)',
    name,
    shape,
    JSON.stringify(config),
    (max?.m ?? 0) + 1,
  );
  return result.lastInsertRowId;
}

export async function renameTracker(db: SQLiteDatabase, id: number, name: string) {
  await db.runAsync('UPDATE trackers SET name = ? WHERE id = ?', name, id);
}

export async function updateTrackerConfig(db: SQLiteDatabase, id: number, config: TrackerConfig) {
  await db.runAsync('UPDATE trackers SET config = ? WHERE id = ?', JSON.stringify(config), id);
}

export async function setTrackerArchived(db: SQLiteDatabase, id: number, archived: boolean) {
  await db.runAsync('UPDATE trackers SET archived = ? WHERE id = ?', archived ? 1 : 0, id);
}

export async function deleteTracker(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM trackers WHERE id = ?', id);
}

interface EntryRow {
  id: number;
  tracker_id: number;
  for_date: string;
  value: string;
}

function toEntry(row: EntryRow): DailyEntry {
  return { id: row.id, trackerId: row.tracker_id, forDate: row.for_date, value: row.value };
}

/** All daily entries for one date, across trackers. */
export async function entriesForDate(db: SQLiteDatabase, forDate: string): Promise<DailyEntry[]> {
  const rows = await db.getAllAsync<EntryRow>('SELECT * FROM daily_entries WHERE for_date = ?', forDate);
  return rows.map(toEntry);
}

/** Entries for one tracker within [startDate, endDate] inclusive. */
export async function entriesInRange(
  db: SQLiteDatabase,
  trackerId: number,
  startDate: string,
  endDate: string,
): Promise<DailyEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM daily_entries WHERE tracker_id = ? AND for_date >= ? AND for_date <= ? ORDER BY for_date',
    trackerId,
    startDate,
    endDate,
  );
  return rows.map(toEntry);
}

/** Set the single value for a bool/scale/measure tracker on a date (replaces any existing). */
export async function setDailyValue(db: SQLiteDatabase, trackerId: number, forDate: string, value: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM daily_entries WHERE tracker_id = ? AND for_date = ?', trackerId, forDate);
    await db.runAsync(
      'INSERT INTO daily_entries (tracker_id, for_date, value) VALUES (?, ?, ?)',
      trackerId,
      forDate,
      value,
    );
  });
}

/** Clear all values for a tracker on a date. */
export async function clearDailyValue(db: SQLiteDatabase, trackerId: number, forDate: string) {
  await db.runAsync('DELETE FROM daily_entries WHERE tracker_id = ? AND for_date = ?', trackerId, forDate);
}

/** Toggle one option of a multi_pick tracker on a date. */
export async function togglePick(db: SQLiteDatabase, trackerId: number, forDate: string, option: string) {
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM daily_entries WHERE tracker_id = ? AND for_date = ? AND value = ?',
    trackerId,
    forDate,
    option,
  );
  if (existing) {
    await db.runAsync('DELETE FROM daily_entries WHERE id = ?', existing.id);
  } else {
    await db.runAsync(
      'INSERT INTO daily_entries (tracker_id, for_date, value) VALUES (?, ?, ?)',
      trackerId,
      forDate,
      option,
    );
  }
}

/** Add a new option to a multi_pick tracker's config (used for "add new category"). */
export async function addPickOption(db: SQLiteDatabase, tracker: { id: number; config: TrackerConfig }, option: string) {
  const options = tracker.config.options ?? [];
  if (options.includes(option)) return;
  await updateTrackerConfig(db, tracker.id, { ...tracker.config, options: [...options, option] });
}
