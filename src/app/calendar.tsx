import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LogIntakeSheet } from '@/components/log-intake-sheet';
import { ThemedText } from '@/components/themed-text';
import { IntakeList } from '@/components/intake-list';
import { Button } from '@/components/ui/button';
import { MonthGrid } from '@/components/ui/month-grid';
import { NavHeader } from '@/components/ui/nav-header';
import { PawDot } from '@/components/ui/paw-dot';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import {
  confirmedDaysInRange,
  datesWithIntake,
  isDayConfirmed,
  listItems,
  setDayConfirmed,
  intakeForDate,
} from '@/db/items';
import { type IntakeEventWithItem } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { useTheme } from '@/hooks/use-theme';
import { useTodayKey } from '@/hooks/use-today-key';
import { calendarDateKey, friendlyDate, monthTitle, parseDateKey } from '@/lib/dates';

export default function CalendarScreen() {
  const theme = useTheme();
  const bottomPadding = useTabContentPadding();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const today = useTodayKey();
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState<{ open: boolean; editing: IntakeEventWithItem | null }>({
    open: false,
    editing: null,
  });

  const monthStart = calendarDateKey(new Date(year, month, 1));
  const monthEnd = calendarDateKey(new Date(year, month + 1, 0));

  const { data, reload, db } = useDbData(
    async (db) => {
      const [items, markedDates, confirmedDates, intake, selectedConfirmed] = await Promise.all([
        listItems(db),
        datesWithIntake(db, monthStart, monthEnd),
        confirmedDaysInRange(db, monthStart, monthEnd),
        intakeForDate(db, selected, 'earliest'),
        isDayConfirmed(db, selected),
      ]);
      return {
        items,
        marked: new Set(markedDates),
        confirmed: new Set(confirmedDates),
        intake,
        selectedConfirmed,
      };
    },
    [monthStart, monthEnd, selected],
  );

  const dayTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const u of data?.intake ?? []) {
      map.set(u.itemId, (map.get(u.itemId) ?? 0) + u.amount);
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
        onPressLabel={() => selectDay(today)}
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
        <IntakeList
          events={data?.intake ?? []}
          emptyLabel={
            data?.selectedConfirmed ? 'Nothing taken — confirmed. 🐾' : 'Nothing logged this day.'
          }
          onPressEvent={(event) => setSheet({ open: true, editing: event })}
        />
        <Button
          label={`+ Log intake for ${friendlyDate(selected)}`}
          onPress={() => setSheet({ open: true, editing: null })}
        />
        {data && data.intake.length === 0 && selected <= today ? (
          <Button
            label={data.selectedConfirmed ? 'Undo nothing-taken' : 'Mark nothing taken'}
            variant="secondary"
            onPress={async () => {
              await setDayConfirmed(db, selected, !data.selectedConfirmed);
              reload();
            }}
          />
        ) : null}
      </ScrollView>

      <LogIntakeSheet
        visible={sheet.open && (data?.items.length ?? 0) > 0}
        items={data?.items ?? []}
        forDate={selected}
        currentTotals={dayTotals}
        editing={sheet.editing}
        onClose={() => setSheet({ open: false, editing: null })}
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
