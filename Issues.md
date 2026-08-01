# Issues

## Done

### ~~"today" screen does not update to current day~~ ✅

Fixed: a tracking day now runs **7am → 7am**, so 3am July 24 counts as July 23.
`dateKey()` in `src/lib/dates.ts` applies the shift, and everything downstream
(totals, weeks, calendar markers, trends, CSV) inherits it because it all flows
through that one function. `useTodayKey()` re-checks on a timer at the next 7am
and whenever the app returns to the foreground, so no restart is needed.

Calendar *grid cells* still use literal dates (`calendarDateKey`) — the 7am rule
applies to entries, not to which box July 24 lives in.

### ~~allow editing of usage entries~~ ✅

Tapping any entry in the Today or Calendar list opens it in the log sheet, where
amount, time, and route can be changed, or the entry deleted.

### ~~add ability to set default amount for a substance~~ ✅

Items have an optional "usual amount" (`items.default_amount`), set when
creating or editing an item. It pre-fills the amount field when logging and is
still editable per entry. Shown in Settings as "· usually 10".

## Open

### Android is unverified

An APK now builds via EAS and installs, but nobody has confirmed how the UI
actually renders on Android. Known fallback paths that have never been
exercised:

- `GlassCard` → solid `ThemedView` (no liquid glass below iOS 26)
- The time picker → Android's native clock dialog rather than the iOS wheel
- `NativeTabs` → Material tab bar; check `useTabContentPadding` insets
- Share sheet / document picker for export & import

## Ideas / someday

- Correlations between items (the old multi-tracker idea, descoped in v1)
- Editing the *item* of an existing entry (currently only amount/time/route)
