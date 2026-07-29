import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogUsageSheet } from '@/components/log-usage-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UsageList } from '@/components/usage-list';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { isDayConfirmed, listSubstances, setDayConfirmed, usageForDate } from '@/db/substances';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { shortDate, todayKey } from '@/lib/dates';

export default function TodayScreen() {
  const bottomPadding = useTabContentPadding();
  const [usageOpen, setUsageOpen] = useState(false);
  const today = todayKey();

  const { data, reload, db } = useDbData(async (db) => {
    const [substances, usage, confirmed] = await Promise.all([
      listSubstances(db),
      usageForDate(db, today),
      isDayConfirmed(db, today),
    ]);
    return { substances, usage, confirmed };
  }, [today]);

  const dayTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const u of data?.usage ?? []) {
      map.set(u.substanceId, (map.get(u.substanceId) ?? 0) + u.amount);
    }
    return map;
  }, [data]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="smallBold" style={styles.title}>
            Today
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {shortDate(today)}
          </ThemedText>
        </ThemedView>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          <UsageList
            events={data?.usage ?? []}
            emptyLabel={data?.confirmed ? 'No use today — confirmed. ✓' : 'Nothing logged today.'}
            onChanged={reload}
          />
          <Button label="+ Log usage" onPress={() => setUsageOpen(true)} />
          {data && data.usage.length === 0 ? (
            <Button
              label={data.confirmed ? 'Undo no-use day' : 'Mark as no-use day'}
              variant="secondary"
              onPress={async () => {
                await setDayConfirmed(db, today, !data.confirmed);
                reload();
              }}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <LogUsageSheet
        visible={usageOpen && (data?.substances.length ?? 0) > 0}
        substances={data?.substances ?? []}
        forDate={today}
        currentTotals={dayTotals}
        onClose={() => setUsageOpen(false)}
        onSaved={reload}
      />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
