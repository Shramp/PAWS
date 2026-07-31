#!/usr/bin/env node
/**
 * Generates 60 days of plausible demo data as a PAWS backup file, ready to
 * import via Settings → Import data…
 *
 *   node scripts/seed-demo.mjs [out.json] [--days 60] [--end YYYY-MM-DD]
 *
 * Deterministic: the same arguments always produce the same file, so
 * screenshots and before/after comparisons stay stable.
 */
import { writeFileSync } from 'node:fs';

const DAY_START_HOUR = 7; // keep in sync with src/lib/dates.ts

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const outPath = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
  ?? 'paws-demo.json';
const days = Number(flag('days', 60));
const endDate = flag('end', null);

/** Mulberry32 — small deterministic PRNG so runs are reproducible. */
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260731);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => lo + rand() * (hi - lo);
const chance = (p) => rand() < p;

function dateKeyOf(d) {
  const s = new Date(d);
  s.setHours(s.getHours() - DAY_START_HOUR);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
}

const items = [
  { id: 1, name: 'Caffeine', unit: 'mg', routes: '["oral"]', daily_total_only: 0, archived: 0, sort_order: 1, default_amount: 95 },
  { id: 2, name: 'Melatonin', unit: 'mg', routes: '["oral"]', daily_total_only: 1, archived: 0, sort_order: 2, default_amount: 3 },
  { id: 3, name: 'Alcohol', unit: 'units', routes: '["oral"]', daily_total_only: 0, archived: 0, sort_order: 3, default_amount: 1 },
];

const intakeEvents = [];
const confirmedDays = [];
let nextId = 1;

// The tracking day `days-1` back through today.
const end = endDate ? new Date(`${endDate}T12:00:00`) : new Date();
const start = new Date(end);
start.setDate(start.getDate() - (days - 1));

/** Wall-clock timestamp for an hour/minute on a given tracking day. */
function stamp(trackingDay, hour, minute) {
  const [y, m, d] = trackingDay.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (hour < DAY_START_HOUR) dt.setDate(dt.getDate() + 1);
  dt.setHours(hour, minute, 0, 0);
  return dt.getTime();
}

for (let i = 0; i < days; i++) {
  const d = new Date(start);
  d.setDate(d.getDate() + i);
  const day = dateKeyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12));
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const isWeekend = dow === 0 || dow === 5 || dow === 6;

  let loggedSomething = false;

  // Caffeine: 1–3 servings, mornings, lighter on weekends. Occasional day off.
  if (chance(isWeekend ? 0.75 : 0.95)) {
    const servings = isWeekend ? (chance(0.4) ? 2 : 1) : chance(0.35) ? 3 : 2;
    for (let s = 0; s < servings; s++) {
      const hour = Math.floor(between(7, 9) + s * between(1.5, 3.5));
      if (hour > 20) continue;
      intakeEvents.push({
        id: nextId++,
        item_id: 1,
        for_date: day,
        timestamp_ms: stamp(day, hour, Math.floor(between(0, 59))),
        amount: pick([65, 95, 95, 120, 150, 180]),
        route: 'oral',
      });
      loggedSomething = true;
    }
  }

  // Melatonin: daily-total-only, most nights, usually 3mg.
  if (chance(0.8)) {
    intakeEvents.push({
      id: nextId++,
      item_id: 2,
      for_date: day,
      timestamp_ms: null,
      amount: pick([1.5, 3, 3, 3, 5]),
      route: null,
    });
    loggedSomething = true;
  }

  // Alcohol: mostly weekends, sometimes spilling past midnight (tests the 7am rule).
  if (chance(isWeekend ? 0.7 : 0.15)) {
    const drinks = isWeekend ? Math.round(between(2, 6)) : Math.round(between(1, 2));
    // Weekend nights start later, so longer sessions run past midnight and
    // land on the previous tracking day — exercising the 7am rule.
    let hour = Math.floor(isWeekend ? between(20, 23) : between(18, 21));
    for (let s = 0; s < drinks; s++) {
      intakeEvents.push({
        id: nextId++,
        item_id: 3,
        for_date: day,
        timestamp_ms: stamp(day, hour % 24, Math.floor(between(0, 59))),
        amount: pick([1, 1, 1.5, 2]),
        route: 'oral',
      });
      hour += 1;
      if (hour >= 26) break; // stop at ~2am
    }
    loggedSomething = true;
  }

  // Nothing at all: affirm it so it reads as a real zero, not a gap.
  if (!loggedSomething) confirmedDays.push({ for_date: day });
}

const endOfRange = new Date(end);
endOfRange.setHours(12, 0, 0, 0); // fixed, so repeated runs are byte-identical

const backup = {
  app: 'paws',
  schemaVersion: 1,
  exportedAt: endOfRange.toISOString(),
  items,
  intake_events: intakeEvents,
  confirmed_days: confirmedDays,
};

writeFileSync(outPath, JSON.stringify(backup, null, 2));

const perItem = items.map(
  (it) => `${it.name}: ${intakeEvents.filter((e) => e.item_id === it.id).length}`,
);
console.log(`Wrote ${outPath}`);
console.log(`  ${days} days (${dateKeyOf(start)} → ${dateKeyOf(end)})`);
console.log(`  ${intakeEvents.length} entries — ${perItem.join(', ')}`);
console.log(`  ${confirmedDays.length} confirmed nothing-taken days`);
console.log('\nImport it in the app: Settings → Import data…');
