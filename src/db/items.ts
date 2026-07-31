import { type SQLiteDatabase } from 'expo-sqlite';

import { type IntakeEvent, type IntakeEventWithItem, type Item, type ItemTotal } from '@/db/types';
import { addDays } from '@/lib/dates';

interface ItemRow {
  id: number;
  name: string;
  unit: string;
  routes: string;
  daily_total_only: number;
  archived: number;
  sort_order: number;
}

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    routes: JSON.parse(row.routes) as string[],
    dailyTotalOnly: row.daily_total_only === 1,
    archived: row.archived === 1,
    sortOrder: row.sort_order,
  };
}

export async function listItems(db: SQLiteDatabase, includeArchived = false): Promise<Item[]> {
  const rows = await db.getAllAsync<ItemRow>(
    includeArchived
      ? 'SELECT * FROM items ORDER BY archived, sort_order, id'
      : 'SELECT * FROM items WHERE archived = 0 ORDER BY sort_order, id',
  );
  return rows.map(toItem);
}

export async function createItem(
  db: SQLiteDatabase,
  item: { name: string; unit: string; routes: string[]; dailyTotalOnly: boolean },
): Promise<number> {
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM items');
  const result = await db.runAsync(
    'INSERT INTO items (name, unit, routes, daily_total_only, sort_order) VALUES (?, ?, ?, ?, ?)',
    item.name,
    item.unit,
    JSON.stringify(item.routes),
    item.dailyTotalOnly ? 1 : 0,
    (max?.m ?? 0) + 1,
  );
  return result.lastInsertRowId;
}

export async function updateItem(
  db: SQLiteDatabase,
  id: number,
  item: { name: string; unit: string; routes: string[]; dailyTotalOnly: boolean },
) {
  await db.runAsync(
    'UPDATE items SET name = ?, unit = ?, routes = ?, daily_total_only = ? WHERE id = ?',
    item.name,
    item.unit,
    JSON.stringify(item.routes),
    item.dailyTotalOnly ? 1 : 0,
    id,
  );
}

export async function setItemArchived(db: SQLiteDatabase, id: number, archived: boolean) {
  await db.runAsync('UPDATE items SET archived = ? WHERE id = ?', archived ? 1 : 0, id);
}

interface IntakeRow {
  id: number;
  item_id: number;
  for_date: string;
  timestamp_ms: number | null;
  amount: number;
  route: string | null;
}

function toIntake(row: IntakeRow): IntakeEvent {
  return {
    id: row.id,
    itemId: row.item_id,
    forDate: row.for_date,
    timestampMs: row.timestamp_ms,
    amount: row.amount,
    route: row.route,
  };
}

export async function addIntake(
  db: SQLiteDatabase,
  e: { itemId: number; forDate: string; timestampMs: number | null; amount: number; route: string | null },
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO intake_events (item_id, for_date, timestamp_ms, amount, route) VALUES (?, ?, ?, ?, ?)',
    e.itemId,
    e.forDate,
    e.timestampMs,
    e.amount,
    e.route,
  );
  return result.lastInsertRowId;
}

/** For daily-total-only items: replace the day's single amount. */
export async function setDailyTotal(db: SQLiteDatabase, itemId: number, forDate: string, amount: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM intake_events WHERE item_id = ? AND for_date = ?', itemId, forDate);
    if (amount > 0) {
      await db.runAsync(
        'INSERT INTO intake_events (item_id, for_date, timestamp_ms, amount, route) VALUES (?, ?, NULL, ?, NULL)',
        itemId,
        forDate,
        amount,
      );
    }
  });
}

export async function deleteIntake(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM intake_events WHERE id = ?', id);
}

type IntakeJoinRow = IntakeRow & { item_name: string; unit: string };

/** All intake events for one day, timestamped ones in chronological order. */
export async function intakeForDate(db: SQLiteDatabase, forDate: string): Promise<IntakeEventWithItem[]> {
  const rows = await db.getAllAsync<IntakeJoinRow>(
    `SELECT e.*, i.name AS item_name, i.unit
     FROM intake_events e JOIN items i ON i.id = e.item_id
     WHERE e.for_date = ?
     ORDER BY e.timestamp_ms IS NULL, e.timestamp_ms, e.id`,
    forDate,
  );
  return rows.map((row) => ({ ...toIntake(row), itemName: row.item_name, unit: row.unit }));
}

async function totalsInRange(db: SQLiteDatabase, startDate: string, endDate: string): Promise<ItemTotal[]> {
  const rows = await db.getAllAsync<{ item_id: number; item_name: string; unit: string; total: number }>(
    `SELECT e.item_id, i.name AS item_name, i.unit, SUM(e.amount) AS total
     FROM intake_events e JOIN items i ON i.id = e.item_id
     WHERE e.for_date >= ? AND e.for_date <= ?
     GROUP BY e.item_id
     ORDER BY i.sort_order, i.id`,
    startDate,
    endDate,
  );
  return rows.map((r) => ({
    itemId: r.item_id,
    itemName: r.item_name,
    unit: r.unit,
    total: r.total,
  }));
}

export async function dailyTotals(db: SQLiteDatabase, forDate: string): Promise<ItemTotal[]> {
  return totalsInRange(db, forDate, forDate);
}

export async function weeklyTotals(db: SQLiteDatabase, weekStartKey: string): Promise<ItemTotal[]> {
  return totalsInRange(db, weekStartKey, addDays(weekStartKey, 6));
}

/** Distinct dates with any intake in [startDate, endDate] — calendar markers. */
export async function datesWithIntake(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ for_date: string }>(
    'SELECT DISTINCT for_date FROM intake_events WHERE for_date >= ? AND for_date <= ?',
    startDate,
    endDate,
  );
  return rows.map((r) => r.for_date);
}

/** Toggle a day's explicit "nothing taken" confirmation. */
export async function setDayConfirmed(db: SQLiteDatabase, forDate: string, confirmed: boolean) {
  if (confirmed) {
    await db.runAsync('INSERT OR IGNORE INTO confirmed_days (for_date) VALUES (?)', forDate);
  } else {
    await db.runAsync('DELETE FROM confirmed_days WHERE for_date = ?', forDate);
  }
}

/** Explicitly confirmed zero dates in [startDate, endDate]. */
export async function confirmedDaysInRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ for_date: string }>(
    'SELECT for_date FROM confirmed_days WHERE for_date >= ? AND for_date <= ?',
    startDate,
    endDate,
  );
  return rows.map((r) => r.for_date);
}

export async function isDayConfirmed(db: SQLiteDatabase, forDate: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ for_date: string }>(
    'SELECT for_date FROM confirmed_days WHERE for_date = ?',
    forDate,
  );
  return row !== null;
}

/**
 * Tracked dates in [startDate, endDate]: any intake event or an explicit
 * confirmation. On a tracked day, an item with no events = zero.
 */
export async function trackedDatesInRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<Set<string>> {
  const [used, confirmed] = await Promise.all([
    datesWithIntake(db, startDate, endDate),
    confirmedDaysInRange(db, startDate, endDate),
  ]);
  return new Set([...used, ...confirmed]);
}

/** First-ever entry date for an item — zeros only count from here on. */
export async function firstEntryDate(db: SQLiteDatabase, itemId: number): Promise<string | null> {
  const row = await db.getFirstAsync<{ first: string | null }>(
    'SELECT MIN(for_date) AS first FROM intake_events WHERE item_id = ?',
    itemId,
  );
  return row?.first ?? null;
}

/** Per-day totals for one item in [startDate, endDate] — trends chart. */
export async function dailyTotalsForItem(
  db: SQLiteDatabase,
  itemId: number,
  startDate: string,
  endDate: string,
): Promise<{ forDate: string; total: number }[]> {
  const rows = await db.getAllAsync<{ for_date: string; total: number }>(
    `SELECT for_date, SUM(amount) AS total FROM intake_events
     WHERE item_id = ? AND for_date >= ? AND for_date <= ?
     GROUP BY for_date`,
    itemId,
    startDate,
    endDate,
  );
  return rows.map((r) => ({ forDate: r.for_date, total: r.total }));
}
