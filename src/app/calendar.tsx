import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { MonthGrid } from '@/components/ui/month-grid';
import { NavHeader } from '@/components/ui/nav-header';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { entriesInRange, listTrackers } from '@/db/trackers';
import { type DailyEntry, type MeasureValue, type Tracker } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTheme } from '@/hooks/use-theme';
import { optionColor, scaleColor } from '@/lib/colors';
import { dateKey, monthTitle } from '@/lib/dates';

export default function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [trackerId, setTrackerId] = useState<number | null>(null);

  const monthStart = dateKey(new Date(year, month, 1));
  const monthEnd = dateKey(new Date(year, month + 1, 0));

  const { data } = useDbData(
    async (db) => {
      const trackers = await listTrackers(db);
      const selected = trackers.find((t) => t.id === trackerId) ?? trackers[0] ?? null;
      const entries = selected ? await entriesInRange(db, selected.id, monthStart, monthEnd) : [];
      return { trackers, selected, entries };
    },
    [trackerId, monthStart, monthEnd],
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DailyEntry[]>();
    for (const e of data?.entries ?? []) {
      const list = map.get(e.forDate) ?? [];
      list.push(e);
      map.set(e.forDate, list);
    }
    return map;
  }, [data]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const tracker = data?.selected ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.trackerBar}
          contentContainerStyle={styles.trackerBarContent}>
          {(data?.trackers ?? []).map((t) => (
            <Chip key={t.id} label={t.name} selected={tracker?.id === t.id} onPress={() => setTrackerId(t.id)} />
          ))}
        </ScrollView>
        <NavHeader label={monthTitle(year, month)} onPrev={prevMonth} onNext={nextMonth} />
        <ScrollView contentContainerStyle={styles.content}>
          {tracker ? (
            <>
              <MonthGrid
                year={year}
                month={month}
                renderDay={(key) => <DayCell tracker={tracker} entries={entriesByDate.get(key) ?? []} />}
              />
              <Legend tracker={tracker} />
            </>
          ) : (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No trackers yet — add one in Settings.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DayCell({ tracker, entries }: { tracker: Tracker; entries: DailyEntry[] }) {
  const theme = useTheme();
  if (entries.length === 0) return null;

  if (tracker.shape === 'bool') {
    return <View style={[styles.dot, { backgroundColor: theme.accent }]} />;
  }

  if (tracker.shape === 'scale') {
    const options = tracker.config.options ?? [];
    const index = options.indexOf(entries[0].value);
    return <View style={[styles.dot, { backgroundColor: scaleColor(Math.max(index, 0), options.length) }]} />;
  }

  if (tracker.shape === 'multi_pick') {
    const options = tracker.config.options ?? [];
    return (
      <View style={styles.miniDots}>
        {entries.slice(0, 3).map((e) => (
          <View
            key={e.id}
            style={[styles.miniDot, { backgroundColor: optionColor(Math.max(options.indexOf(e.value), 0)) }]}
          />
        ))}
        {entries.length > 3 ? (
          <ThemedText type="code" themeColor="textSecondary" style={styles.moreText}>
            +
          </ThemedText>
        ) : null}
      </View>
    );
  }

  // measure: value number colored by rating
  const value = JSON.parse(entries[0].value) as MeasureValue;
  const ratings = tracker.config.ratingOptions ?? [];
  const index = ratings.indexOf(value.r);
  return (
    <ThemedText
      type="smallBold"
      style={{ color: scaleColor(Math.max(index, 0), ratings.length), fontSize: 13 }}>
      {value.v}
    </ThemedText>
  );
}

function Legend({ tracker }: { tracker: Tracker }) {
  const options =
    tracker.shape === 'scale' || tracker.shape === 'multi_pick'
      ? (tracker.config.options ?? [])
      : tracker.shape === 'measure'
        ? (tracker.config.ratingOptions ?? [])
        : [];
  if (options.length === 0) return null;

  const colorFor = (i: number) =>
    tracker.shape === 'multi_pick' ? optionColor(i) : scaleColor(i, options.length);

  return (
    <View style={styles.legend}>
      {options.map((option, i) => (
        <View key={option} style={styles.legendItem}>
          <View style={[styles.miniDot, { backgroundColor: colorFor(i) }]} />
          <ThemedText type="small" themeColor="textSecondary">
            {option}
          </ThemedText>
        </View>
      ))}
    </View>
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
  trackerBar: {
    flexGrow: 0,
  },
  trackerBarContent: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  content: {
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.four,
  },
  empty: {
    padding: Spacing.four,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  miniDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreText: {
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
