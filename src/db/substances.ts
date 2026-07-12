import { type SQLiteDatabase } from 'expo-sqlite';

import {
  type Substance,
  type SubstanceTotal,
  type UsageEvent,
  type UsageEventWithSubstance,
} from '@/db/types';
import { addDays } from '@/lib/dates';

interface SubstanceRow {
  id: number;
  name: string;
  unit: string;
  routes: string;
  daily_total_only: number;
  archived: number;
  sort_order: number;
}

function toSubstance(row: SubstanceRow): Substance {
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

export async function listSubstances(db: SQLiteDatabase, includeArchived = false): Promise<Substance[]> {
  const rows = await db.getAllAsync<SubstanceRow>(
    includeArchived
      ? 'SELECT * FROM substances ORDER BY archived, sort_order, id'
      : 'SELECT * FROM substances WHERE archived = 0 ORDER BY sort_order, id',
  );
  return rows.map(toSubstance);
}

export async function createSubstance(
  db: SQLiteDatabase,
  s: { name: string; unit: string; routes: string[]; dailyTotalOnly: boolean },
): Promise<number> {
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM substances');
  const result = await db.runAsync(
    'INSERT INTO substances (name, unit, routes, daily_total_only, sort_order) VALUES (?, ?, ?, ?, ?)',
    s.name,
    s.unit,
    JSON.stringify(s.routes),
    s.dailyTotalOnly ? 1 : 0,
    (max?.m ?? 0) + 1,
  );
  return result.lastInsertRowId;
}

export async function updateSubstance(
  db: SQLiteDatabase,
  id: number,
  s: { name: string; unit: string; routes: string[]; dailyTotalOnly: boolean },
) {
  await db.runAsync(
    'UPDATE substances SET name = ?, unit = ?, routes = ?, daily_total_only = ? WHERE id = ?',
    s.name,
    s.unit,
    JSON.stringify(s.routes),
    s.dailyTotalOnly ? 1 : 0,
    id,
  );
}

export async function setSubstanceArchived(db: SQLiteDatabase, id: number, archived: boolean) {
  await db.runAsync('UPDATE substances SET archived = ? WHERE id = ?', archived ? 1 : 0, id);
}

interface UsageRow {
  id: number;
  substance_id: number;
  for_date: string;
  timestamp_ms: number | null;
  amount: number;
  route: string | null;
}

function toUsage(row: UsageRow): UsageEvent {
  return {
    id: row.id,
    substanceId: row.substance_id,
    forDate: row.for_date,
    timestampMs: row.timestamp_ms,
    amount: row.amount,
    route: row.route,
  };
}

export async function addUsage(
  db: SQLiteDatabase,
  u: { substanceId: number; forDate: string; timestampMs: number | null; amount: number; route: string | null },
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO usage_events (substance_id, for_date, timestamp_ms, amount, route) VALUES (?, ?, ?, ?, ?)',
    u.substanceId,
    u.forDate,
    u.timestampMs,
    u.amount,
    u.route,
  );
  return result.lastInsertRowId;
}

/** For daily-total-only substances: replace the day's single amount. */
export async function setDailyTotal(db: SQLiteDatabase, substanceId: number, forDate: string, amount: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM usage_events WHERE substance_id = ? AND for_date = ?', substanceId, forDate);
    if (amount > 0) {
      await db.runAsync(
        'INSERT INTO usage_events (substance_id, for_date, timestamp_ms, amount, route) VALUES (?, ?, NULL, ?, NULL)',
        substanceId,
        forDate,
        amount,
      );
    }
  });
}

export async function deleteUsage(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM usage_events WHERE id = ?', id);
}

type UsageJoinRow = UsageRow & { substance_name: string; unit: string };

/** All usage events for one day, timestamped ones in chronological order. */
export async function usageForDate(db: SQLiteDatabase, forDate: string): Promise<UsageEventWithSubstance[]> {
  const rows = await db.getAllAsync<UsageJoinRow>(
    `SELECT u.*, s.name AS substance_name, s.unit
     FROM usage_events u JOIN substances s ON s.id = u.substance_id
     WHERE u.for_date = ?
     ORDER BY u.timestamp_ms IS NULL, u.timestamp_ms, u.id`,
    forDate,
  );
  return rows.map((row) => ({ ...toUsage(row), substanceName: row.substance_name, unit: row.unit }));
}

async function totalsInRange(db: SQLiteDatabase, startDate: string, endDate: string): Promise<SubstanceTotal[]> {
  const rows = await db.getAllAsync<{ substance_id: number; substance_name: string; unit: string; total: number }>(
    `SELECT u.substance_id, s.name AS substance_name, s.unit, SUM(u.amount) AS total
     FROM usage_events u JOIN substances s ON s.id = u.substance_id
     WHERE u.for_date >= ? AND u.for_date <= ?
     GROUP BY u.substance_id
     ORDER BY s.sort_order, s.id`,
    startDate,
    endDate,
  );
  return rows.map((r) => ({
    substanceId: r.substance_id,
    substanceName: r.substance_name,
    unit: r.unit,
    total: r.total,
  }));
}

export async function dailyTotals(db: SQLiteDatabase, forDate: string): Promise<SubstanceTotal[]> {
  return totalsInRange(db, forDate, forDate);
}

export async function weeklyTotals(db: SQLiteDatabase, weekStartKey: string): Promise<SubstanceTotal[]> {
  return totalsInRange(db, weekStartKey, addDays(weekStartKey, 6));
}
