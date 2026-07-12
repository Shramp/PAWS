# PAWS 🐾

Personal, offline-only tracking app. All data lives in a local SQLite database on the phone — no server, no network, no sync.

## What it does

- **Substances** — log usage events (timestamp, amount, route) per substance. Each substance has its own unit and administration routes; substances can be flagged *daily-total-only* (one amount per day, no timestamps). Day timeline + daily/weekly totals views.
- **Daily trackers** — configurable trackers built from four shapes:
  - *yes / no* (stretch, play with cats, left the house)
  - *scale* (how was the day: terrible → amazing)
  - *multi-choice* (exercise categories, growable while logging)
  - *number + rating* (sleep: hours + poor/fair/good/great)

  New trackers are added in Settings — no code changes needed.
- **Calendar** — month view per tracker with color-coded days.
- **Todos** — simple list; completed items keep a note + date and stay visible.
- Every entry can be backdated (log yesterday's exercise, set a manual time on a usage event).

## Stack

Expo SDK 57 · React Native · TypeScript · expo-router (native tabs) · expo-sqlite

## Development

```bash
npm install
npx expo start --ios      # dev build in the iOS simulator via Expo Go
```

Note: use a non-default port (`--port 8090`) if something else occupies 8081.

Checks:

```bash
npx tsc --noEmit
npx expo lint
```

## Project layout

```
src/
  app/          # one file per tab (expo-router): index (Today), calendar,
                # substances (Totals), todos, settings
  components/   # form sheets + ui/ primitives (Chip, Sheet, MonthGrid, …)
  db/           # schema + migrations, typed query modules
  hooks/        # useDbData (focus-aware SQLite loader)
  lib/          # date-key helpers, scale/category colors
scripts/
  gen-icons.mjs # regenerates the paw icon set (needs @resvg/resvg-js)
```

All dates are local-timezone `YYYY-MM-DD` keys; entries are keyed by the day they apply to, independent of when they were entered.

## Installing on a phone

- **iOS**: `npx expo run:ios --device --configuration Release` with the iPhone plugged in (needs Xcode; free Apple ID = 7-day resign, paid developer account = 1 year).
- **Android**: `eas build -p android --profile preview` (or a local `npx expo run:android --variant release`) produces an APK to sideload.

Each install has its own private database.
