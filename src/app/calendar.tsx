import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LogUsageSheet } from '@/components/log-usage-sheet';
import { ThemedText } from '@/components/themed-text';
import { UsageList } from '@/components/usage-list';
import { Button } from '@/components/ui/button';
import { MonthGrid } from '@/components/ui/month-grid';
import { NavHeader } from '@/components/ui/nav-header';
import { PawDot } from '@/components/ui/paw-dot';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import {
  confirmedDaysInRange,
  datesWithUsage,
  isDayConfirmed,
  listSubstances,
  setDayConfirmed,
  usageForDate,
} from '@/db/substances';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { useTheme } from '@/hooks/use-theme';
import { dateKey, friendlyDate, monthTitle, parseDateKey, todayKey } from '@/lib/dates';

export default function CalendarScreen() {
  const theme = useTheme();
  const bottomPadding = useTabContentPadding();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(todayKey());
  const [usageOpen, setUsageOpen] = useState(false);

  const monthStart = dateKey(new Date(year, month, 1));
  const monthEnd = dateKey(new Date(year, month + 1, 0));

  const { data, reload, db } = useDbData(
    async (db) => {
      const [substances, markedDates, confirmedDates, usage, selectedConfirmed] = await Promise.all([
        listSubstances(db),
        datesWithUsage(db, monthStart, monthEnd),
        confirmedDaysInRange(db, monthStart, monthEnd),
        usageForDate(db, selected),
        isDayConfirmed(db, selected),
      ]);
      return {
        substances,
        marked: new Set(markedDates),
        confirmed: new Set(confirmedDates),
        usage,
        selectedConfirmed,
      };
    },
    [monthStart, monthEnd, selected],
  );

  const dayTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const u of data?.usage ?? []) {
      map.set(u.substanceId, (map.get(u.substanceId) ?? 0) + u.amount);
    }
    return map;
  }, [data]);

  const stepMonth = (direction: 1 | -1) => {
    const d = new Date(year, month + direction, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const selectDay = (key: string) => {
    setSelected(key);
    const d = parseDateKey(key);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <Screen>
      <NavHeader
        label={monthTitle(year, month)}
        onPrev={() => stepMonth(-1)}
        onNext={() => stepMonth(1)}
        onPressLabel={() => selectDay(todayKey())}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        <MonthGrid
          year={year}
          month={month}
          selectedDay={selected}
          onPressDay={setSelected}
          renderDay={(key) =>
            data?.marked.has(key) ? (
              <PawDot size={13} color={theme.accent} />
            ) : data?.confirmed.has(key) ? (
              <View style={[styles.zeroRing, { borderColor: theme.accentSecondary }]} />
            ) : null
          }
        />
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          {friendlyDate(selected).toUpperCase()}
        </ThemedText>
        <UsageList
          events={data?.usage ?? []}
          emptyLabel={
            data?.selectedConfirmed ? 'Confirmed no-use day — clean paws. 🐾' : 'Nothing logged this day.'
          }
          onChanged={reload}
        />
        <Button label={`+ Log usage for ${friendlyDate(selected)}`} onPress={() => setUsageOpen(true)} />
        {data && data.usage.length === 0 && selected <= todayKey() ? (
          <Button
            label={data.selectedConfirmed ? 'Undo no-use day' : 'Mark as no-use day'}
            variant="secondary"
            onPress={async () => {
              await setDayConfirmed(db, selected, !data.selectedConfirmed);
              reload();
            }}
          />
        ) : null}
      </ScrollView>

      <LogUsageSheet
        visible={usageOpen}
        substances={data?.substances ?? []}
        forDate={selected}
        currentTotals={dayTotals}
        onClose={() => setUsageOpen(false)}
        onSaved={reload}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  zeroRing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    letterSpacing: 1,
  },
});
