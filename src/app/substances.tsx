import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { NavHeader } from '@/components/ui/nav-header';
import { Spacing } from '@/constants/theme';
import { dailyTotals, weeklyTotals } from '@/db/substances';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { addDays, friendlyDate, startOfWeekKey, todayKey, weekRangeLabel } from '@/lib/dates';

type Mode = 'day' | 'week';

export default function TotalsScreen() {
  const bottomPadding = useTabContentPadding();
  const [mode, setMode] = useState<Mode>('day');
  const [date, setDate] = useState(todayKey());
  const weekStart = startOfWeekKey(date);

  const { data: totals } = useDbData(
    async (db) => (mode === 'day' ? dailyTotals(db, date) : weeklyTotals(db, weekStart)),
    [mode, date, weekStart],
  );

  const step = (direction: 1 | -1) => {
    setDate(addDays(mode === 'day' ? date : weekStart, direction * (mode === 'day' ? 1 : 7)));
  };

  const label = mode === 'day' ? friendlyDate(date) : weekRangeLabel(weekStart);
  const isCurrent = mode === 'day' ? date === todayKey() : weekStart === startOfWeekKey(todayKey());

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.modeRow}>
          <Chip label="Day" selected={mode === 'day'} onPress={() => setMode('day')} />
          <Chip label="Week" selected={mode === 'week'} onPress={() => setMode('week')} />
        </View>
        <NavHeader
          label={label}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onPressLabel={isCurrent ? undefined : () => setDate(todayKey())}
        />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          {(totals ?? []).length === 0 ? (
            <ThemedText themeColor="textSecondary">
              No usage logged for this {mode}.
            </ThemedText>
          ) : (
            (totals ?? []).map((t) => (
              <ThemedView key={t.substanceId} type="backgroundElement" style={styles.row}>
                <ThemedText style={styles.rowName}>{t.substanceName}</ThemedText>
                <ThemedText type="smallBold">
                  {Math.round(t.total * 100) / 100}
                  {t.unit}
                </ThemedText>
              </ThemedView>
            ))
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
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowName: {
    flex: 1,
  },
});
