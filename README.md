# PAWS 🐾

Personal, offline-only usage tracking app. All data lives in a local SQLite database on the phone — no server, no network, no sync.

## What it does

- **Log usage events** — timestamp (now or manual), amount, and administration route per substance. Every entry can be backdated.
- **Substances are config** — each has its own unit (mg, ml, …) and routes (asked when logging only if it has more than one). Substances can be flagged *daily-total-only*: one amount per day, no timestamps.
- **Views** — chronological day timeline (Today tab) and per-substance daily/weekly totals (Totals tab).
- **Settings** — add / edit / archive substances in-app.

Earlier iterations included general daily trackers (sleep, exercise, mood, …), a calendar view, and a todo list — descoped for v1 but recoverable from git history (`640dac9` and earlier).

## Stack

Expo SDK 57 · React Native · TypeScript · expo-router (native tabs) · expo-sqlite

## Development

```bash
npm install
npm run ios    # boots the iPhone 13 Pro simulator, starts Metro on port 8090
```

Metro runs on port 8090 (8081 is taken locally). `shift+i` in the Metro terminal picks a different simulator.

Checks:

```bash
npx tsc --noEmit
npx expo lint
```

## Project layout

```
src/
  app/          # one file per tab (expo-router): index (Today), substances (Totals), settings
  components/   # log-usage & substance-editor sheets + ui/ primitives (Chip, Sheet, …)
  db/           # schema + migrations (PRAGMA user_version), typed query module
  hooks/        # useDbData (focus-aware SQLite loader), useTabContentPadding
  lib/          # date-key helpers
scripts/
  gen-icons.mjs # regenerates the paw icon set (needs @resvg/resvg-js)
```

All dates are local-timezone `YYYY-MM-DD` keys; entries are keyed by the day they apply to, independent of when they were entered.

## Installing on a phone

- **iOS**: `npx expo run:ios --device --configuration Release` with the iPhone plugged in (needs Xcode; free Apple ID = 7-day resign, paid developer account = 1 year).
- **Android**: `eas build -p android --profile preview` (or a local `npx expo run:android --variant release`) produces an APK to sideload.

Each install has its own private database.
