import { type SQLiteDatabase } from 'expo-sqlite';

import { addDays, startOfWeekKey, todayKey } from '@/lib/dates';

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Spreadsheet-friendly summary: one row per tracked period per substance.
 *   granularity: daily | weekly (weekly periods are Monday-start)
 *   period:      the day, or the week's start day
 *   total:       0 = affirmed zero (tracked); untracked periods are omitted
 * Periods start at each substance's first-ever entry.
 */
export async function exportCsvSummary(db: SQLiteDatabase): Promise<string> {
  const today = todayKey();

  const substances = await db.getAllAsync<{ id: number; name: string; unit: string }>(
    'SELECT id, name, unit FROM substances ORDER BY sort_order, id',
  );
  const totals = await db.getAllAsync<{ substance_id: number; for_date: string; total: number }>(
    'SELECT substance_id, for_date, SUM(amount) AS total FROM usage_events GROUP BY substance_id, for_date',
  );
  const trackedRows = await db.getAllAsync<{ for_date: string }>(
    'SELECT DISTINCT for_date FROM usage_events UNION SELECT for_date FROM confirmed_days',
  );

  const tracked = new Set(trackedRows.map((r) => r.for_date));
  const bySubstance = new Map<number, Map<string, number>>();
  for (const t of totals) {
    const m = bySubstance.get(t.substance_id) ?? new Map<string, number>();
    m.set(t.for_date, t.total);
    bySubstance.set(t.substance_id, m);
  }

  const lines = ['granularity,period,substance,unit,total'];

  for (const granularity of ['daily', 'weekly'] as const) {
    for (const s of substances) {
      const days = bySubstance.get(s.id);
      if (!days || days.size === 0) continue;
      const firstEntry = [...days.keys()].sort()[0];

      if (granularity === 'daily') {
        for (let key = firstEntry; key <= today; key = addDays(key, 1)) {
          if (!tracked.has(key)) continue;
          lines.push(
            [granularity, key, csvField(s.name), csvField(s.unit), days.get(key) ?? 0].join(','),
          );
        }
      } else {
        for (let weekStart = startOfWeekKey(firstEntry); weekStart <= today; weekStart = addDays(weekStart, 7)) {
          let total = 0;
          let weekTracked = false;
          for (let d = 0; d < 7; d++) {
            const key = addDays(weekStart, d);
            if (key < firstEntry || key > today) continue;
            total += days.get(key) ?? 0;
            if (tracked.has(key)) weekTracked = true;
          }
          if (!weekTracked) continue;
          lines.push([granularity, weekStart, csvField(s.name), csvField(s.unit), total].join(','));
        }
      }
    }
  }

  return lines.join('\n') + '\n';
}
