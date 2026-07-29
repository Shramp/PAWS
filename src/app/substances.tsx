import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart, type BarDatum } from '@/components/bar-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { dailyTotalsForSubstance, firstEntryDate, listSubstances, trackedDatesInRange } from '@/db/substances';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { addDays, friendlyDate, shortDate, startOfWeekKey, todayKey, weekRangeLabel } from '@/lib/dates';

type Mode = 'days' | 'weeks';

const DAY_RANGES = [30, 60, 90];
const WEEK_RANGES = [12, 26, 52];

const MONTH_ABBR = (key: string) => shortDate(key).split(' ')[0];

export default function TrendsScreen() {
  const bottomPadding = useTabContentPadding();
  const [mode, setMode] = useState<Mode>('days');
  const [dayRange, setDayRange] = useState(DAY_RANGES[0]);
  const [weekRange, setWeekRange] = useState(WEEK_RANGES[0]);
  const [substanceId, setSubstanceId] = useState<number | null>(null);
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  const today = todayKey();
  const count = mode === 'days' ? dayRange : weekRange;
  const rangeStart =
    mode === 'days' ? addDays(today, -(count - 1)) : addDays(startOfWeekKey(today), -7 * (count - 1));

  const { data } = useDbData(
    async (db) => {
      const substances = await listSubstances(db);
      const selected = substances.find((s) => s.id === substanceId) ?? substances[0] ?? null;
      const [totals, tracked, firstEntry] = selected
        ? await Promise.all([
            dailyTotalsForSubstance(db, selected.id, rangeStart, today),
            trackedDatesInRange(db, rangeStart, today),
            firstEntryDate(db, selected.id),
          ])
        : [[], new Set<string>(), null];
      return { substances, selected, totals, tracked, firstEntry };
    },
    [substanceId, mode, rangeStart, today],
  );

  const bars = useMemo<BarDatum[]>(() => {
    const byDate = new Map((data?.totals ?? []).map((t) => [t.forDate, t.total]));
    const tracked = data?.tracked ?? new Set<string>();
    const firstEntry = data?.firstEntry ?? null;
    // Zeros only count as data from the substance's first-ever entry onward.
    const zeroStart = firstEntry === null ? null : firstEntry > rangeStart ? firstEntry : rangeStart;
    const isTrackedForSubstance = (key: string) =>
      zeroStart !== null && key >= zeroStart && key <= today && tracked.has(key);

    if (mode === 'days') {
      const out: BarDatum[] = [];
      for (let i = 0; i < count; i++) {
        const key = addDays(rangeStart, i);
        const dayNum = Number(key.slice(8));
        const total = byDate.get(key) ?? 0;
        out.push({
          key,
          label: String(dayNum),
          monthMark: i === 0 || dayNum === 1 ? MONTH_ABBR(key) : undefined,
          total,
          trackedZero: total === 0 && isTrackedForSubstance(key),
        });
      }
      return out;
    }
    const out: BarDatum[] = [];
    let prevMonth = '';
    for (let i = 0; i < count; i++) {
      const weekStart = addDays(rangeStart, i * 7);
      let total = 0;
      let weekTracked = false;
      for (let d = 0; d < 7; d++) {
        const key = addDays(weekStart, d);
        total += byDate.get(key) ?? 0;
        if (isTrackedForSubstance(key)) weekTracked = true;
      }
      const monthOfWeek = MONTH_ABBR(weekStart);
      out.push({
        key: weekStart,
        label: String(Number(weekStart.slice(8))),
        monthMark: monthOfWeek !== prevMonth ? monthOfWeek : undefined,
        total,
        trackedZero: total === 0 && weekTracked,
      });
      prevMonth = monthOfWeek;
    }
    return out;
  }, [data, mode, count, rangeStart, today]);

  const substance = data?.selected ?? null;
  const grandTotal = bars.reduce((sum, b) => sum + b.total, 0);
  // Tracked periods = used or affirmed-zero; unknown periods stay out of the averages.
  const trackedPeriods = bars.filter((b) => b.total > 0 || b.trackedZero).length;
  const zeroPeriods = bars.filter((b) => b.trackedZero).length;
  const average = trackedPeriods > 0 ? grandTotal / trackedPeriods : 0;
  const selectedDatum = bars.find((b) => b.key === selectedBar) ?? null;
  const peak = bars.reduce<BarDatum | null>((best, b) => (b.total > (best?.total ?? 0) ? b : best), null);

  const round = (n: number) => Math.round(n * 100) / 100;
  const periodLabel = (key: string) => (mode === 'days' ? friendlyDate(key) : weekRangeLabel(key));

  const clearSelection = () => setSelectedBar(null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chipBarContent}>
          {(data?.substances ?? []).map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={substance?.id === s.id}
              onPress={() => {
                setSubstanceId(s.id);
                clearSelection();
              }}
            />
          ))}
        </ScrollView>
        <View style={styles.modeRow}>
          <Chip
            label="Days"
            selected={mode === 'days'}
            onPress={() => {
              setMode('days');
              clearSelection();
            }}
          />
          <Chip
            label="Weeks"
            selected={mode === 'weeks'}
            onPress={() => {
              setMode('weeks');
              clearSelection();
            }}
          />
          <View style={styles.rangeDivider} />
          {(mode === 'days' ? DAY_RANGES : WEEK_RANGES).map((r) => (
            <Chip
              key={r}
              label={`${r}${mode === 'days' ? 'd' : 'w'}`}
              selected={count === r}
              onPress={() => {
                (mode === 'days' ? setDayRange : setWeekRange)(r);
                clearSelection();
              }}
            />
          ))}
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          {!substance ? (
            <ThemedText themeColor="textSecondary">
              No substances yet — add them in Settings to see trends.
            </ThemedText>
          ) : grandTotal === 0 ? (
            <ThemedText themeColor="textSecondary">
              No usage logged for {substance.name} in the last {count} {mode === 'days' ? 'days' : 'weeks'}.
            </ThemedText>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={styles.chartCard}>
                <ThemedText type="smallBold">
                  {selectedDatum
                    ? `${periodLabel(selectedDatum.key)} · ${round(selectedDatum.total)}${substance.unit}`
                    : `${substance.name}, last ${count} ${mode === 'days' ? 'days' : 'weeks'}`}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {selectedDatum
                    ? selectedDatum.trackedZero
                      ? 'Confirmed zero — tap again to deselect'
                      : 'Tap again to deselect'
                    : peak
                      ? `Peak ${round(peak.total)}${substance.unit} · ${periodLabel(peak.key)}`
                      : ''}
                </ThemedText>
                <BarChart
                  data={bars}
                  selectedKey={selectedBar}
                  onSelect={(key) => setSelectedBar(key === selectedBar ? null : key)}
                />
              </ThemedView>
              <ThemedView type="backgroundElement" style={styles.statsCard}>
                <View style={styles.stat}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Total ({count}
                    {mode === 'days' ? 'd' : 'w'})
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {round(grandTotal)}
                    {substance.unit}
                  </ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Avg per tracked {mode === 'days' ? 'day' : 'week'}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {round(average)}
                    {substance.unit}
                  </ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Zero {mode === 'days' ? 'days' : 'weeks'}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {zeroPeriods}/{trackedPeriods} tracked
                  </ThemedText>
                </View>
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  chipBar: {
    flexGrow: 0,
  },
  chipBarContent: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  rangeDivider: {
    width: Spacing.two,
  },
  content: {
    padding: Spacing.three,
    paddingTop: 0,
    gap: Spacing.two,
  },
  chartCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  statsCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    gap: 2,
  },
});
