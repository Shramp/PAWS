# PAWS 🐾

Personal, offline-only intake tracking app. All data lives in a local SQLite database on the phone — no server, no network, no sync, no accounts, no telemetry.

PAWS could stand for:

- **P**ersonal **A**wareness **W**ithout **S**hame
- **P**urrfectly **A**dequate **W**ellness **S**tats

## What it does

- **Log intake** — timestamp (now or manual, via the native wheel picker), amount, and administration route per item. Every entry can be backdated from the Calendar tab, and tapping an existing entry edits or deletes it.
- **Items are config** — each has its own unit (mg, ml, …), an optional usual amount that pre-fills when logging, and routes (asked when logging only if it has more than one). An item can be flagged *daily-total-only*: one amount per day, no timestamps.
- **Days run 7am → 7am** — late-night activity belongs to the day you were awake for, so 3am on the 24th counts toward the 23rd. Every total, week, and chart honors this.
- **Nothing-taken days are data** — mark a day as explicitly zero, so "I took nothing" is distinguishable from "I wasn't tracking." A day counts as *tracked* if it has any entry or that mark; per item, zeros only count from that item's first-ever entry onward.
- **Views** — Today (timeline for today), Calendar (month grid of paw prints, tap any day to review or backfill), Trends (per-item bar chart over 30/60/90 days or 12/26/52 weeks, with totals and averages over tracked periods only).
- **Your data stays yours** — JSON backup export/import (for moving to a new install) and a one-way CSV summary of daily/weekly totals for spreadsheets.

Earlier iterations included general daily trackers (sleep, exercise, mood, …) and a todo list — descoped but recoverable from git history (`640dac9` and earlier).

## Stack

Expo SDK 57 · React Native · TypeScript · expo-router (native tabs) · expo-sqlite

The UI is always-dark: a plum gradient with liquid-glass cards on iOS 26+ (solid cards elsewhere), pastel pink for intake and pastel teal for confirmed zeros.

## Development

```bash
npm install
npm run ios    # boots the iPhone 13 Pro simulator, starts Metro on port 8090
```

Metro runs on port 8090 (8081 is taken on the author's machine). `shift+i` in the Metro terminal picks a different simulator.

Checks:

```bash
npx tsc --noEmit
npx expo lint
```

## Project layout

```
src/
  app/          # one file per tab (expo-router): index (Today), calendar, trends, settings
  components/   # log-intake & item-editor sheets, bar chart, intake list
    ui/         # primitives: GlassCard, Screen, Chip, Button, Sheet, MonthGrid, PawDot, …
  db/           # schema (PRAGMA user_version), typed queries, backup + CSV export
  hooks/        # useDbData (focus-aware SQLite loader), useTabContentPadding, useTheme
  lib/          # date-key helpers
scripts/
  gen-icons.mjs      # regenerates the paw icon set (needs @resvg/resvg-js)
  seed-demo.mjs      # generates importable demo data (see below)
  convert-backup.mjs # one-off: converts pre-rename backups to the current format
```

### Demo data

```bash
node scripts/seed-demo.mjs paws-demo.json          # 60 days, ending today
node scripts/seed-demo.mjs demo.json --days 90 --end 2026-07-31
```

Writes a backup file to import via **Settings → Import data…** (this replaces
whatever is in the app, so export real data first). Output is deterministic —
the same arguments always produce the same file, so screenshots stay stable.

It generates caffeine (a few servings most mornings), melatonin (a single
nightly daily-total dose), and alcohol (weekend-heavy, with sessions that run
past midnight to exercise the 7am day boundary), plus explicitly-confirmed
nothing-taken days.

### Data model

- `items` — the things you take: name, unit, allowed routes, daily-total-only flag
- `intake_events` — one row per logged intake; `timestamp_ms` is null for daily-total items
- `confirmed_days` — days explicitly affirmed as "nothing taken at all"

All dates are local-timezone `YYYY-MM-DD` keys; entries are keyed by the day they apply to, independent of when they were entered.

## Installing on a phone

- **iOS**: `npx expo run:ios --device --configuration Release` with the iPhone plugged in (needs Xcode; free Apple ID = 7-day resign, paid developer account = 1 year).
- **Android**: `eas build -p android --profile preview` (or a local `npx expo run:android --variant release`) produces an APK to sideload.

Expo Go can't run this project on a physical device — the store builds are pinned to SDK 54 while this is SDK 57. The simulator is fine.

Each install has its own private database; nothing syncs between devices.
