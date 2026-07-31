import { type SQLiteDatabase } from 'expo-sqlite';

import { addDays, startOfWeekKey, todayKey } from '@/lib/dates';

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Spreadsheet-friendly summary: one row per tracked period per item.
 *   granularity: daily | weekly (weekly periods are Monday-start)
 *   period:      the day, or the week's start day
 *   total:       0 = affirmed zero (tracked); untracked periods are omitted
 * Periods start at each item's first-ever entry.
 */
export async function exportCsvSummary(db: SQLiteDatabase): Promise<string> {
  const today = todayKey();

  const items = await db.getAllAsync<{ id: number; name: string; unit: string }>(
    'SELECT id, name, unit FROM items ORDER BY sort_order, id',
  );
  const totals = await db.getAllAsync<{ item_id: number; for_date: string; total: number }>(
    'SELECT item_id, for_date, SUM(amount) AS total FROM intake_events GROUP BY item_id, for_date',
  );
  const trackedRows = await db.getAllAsync<{ for_date: string }>(
    'SELECT DISTINCT for_date FROM intake_events UNION SELECT for_date FROM confirmed_days',
  );

  const tracked = new Set(trackedRows.map((r) => r.for_date));
  const byItem = new Map<number, Map<string, number>>();
  for (const t of totals) {
    const m = byItem.get(t.item_id) ?? new Map<string, number>();
    m.set(t.for_date, t.total);
    byItem.set(t.item_id, m);
  }

  const lines = ['granularity,period,item,unit,total'];

  for (const granularity of ['daily', 'weekly'] as const) {
    for (const item of items) {
      const days = byItem.get(item.id);
      if (!days || days.size === 0) continue;
      const firstEntry = [...days.keys()].sort()[0];

      if (granularity === 'daily') {
        for (let key = firstEntry; key <= today; key = addDays(key, 1)) {
          if (!tracked.has(key)) continue;
          lines.push(
            [granularity, key, csvField(item.name), csvField(item.unit), days.get(key) ?? 0].join(','),
          );
        }
      } else {
        for (
          let weekStart = startOfWeekKey(firstEntry);
          weekStart <= today;
          weekStart = addDays(weekStart, 7)
        ) {
          let total = 0;
          let weekTracked = false;
          for (let d = 0; d < 7; d++) {
            const key = addDays(weekStart, d);
            if (key < firstEntry || key > today) continue;
            total += days.get(key) ?? 0;
            if (tracked.has(key)) weekTracked = true;
          }
          if (!weekTracked) continue;
          lines.push(
            [granularity, weekStart, csvField(item.name), csvField(item.unit), total].join(','),
          );
        }
      }
    }
  }

  return lines.join('\n') + '\n';
}
