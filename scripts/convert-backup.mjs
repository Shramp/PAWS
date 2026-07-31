#!/usr/bin/env node
/**
 * Converts a pre-rename PAWS backup (substances / usage_events) to the
 * current format (items / intake_events).
 *
 *   node scripts/convert-backup.mjs old-backup.json [converted.json]
 *
 * One-off migration helper for the July 2026 "substance" → "item" rename.
 * Safe to delete once no old backups remain.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [inPath, outPath = inPath.replace(/\.json$/, '') + '-converted.json'] = process.argv.slice(2);

if (!inPath) {
  console.error('usage: node scripts/convert-backup.mjs <old-backup.json> [out.json]');
  process.exit(1);
}

const old = JSON.parse(readFileSync(inPath, 'utf8'));

if (old.app !== 'paws') {
  console.error('Not a PAWS backup (missing "app": "paws").');
  process.exit(1);
}
if (old.items) {
  console.error('This backup is already in the new format — nothing to do.');
  process.exit(1);
}

const converted = {
  app: 'paws',
  schemaVersion: 1,
  exportedAt: old.exportedAt ?? new Date().toISOString(),
  items: (old.substances ?? []).map((s) => ({ ...s })),
  intake_events: (old.usage_events ?? []).map(({ substance_id, ...rest }) => ({
    ...rest,
    item_id: substance_id,
  })),
  confirmed_days: old.confirmed_days ?? [],
};

writeFileSync(outPath, JSON.stringify(converted, null, 2));
console.log(
  `Converted ${converted.items.length} items, ${converted.intake_events.length} intake events, ` +
    `${converted.confirmed_days.length} no-use days → ${outPath}`,
);
