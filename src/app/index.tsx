import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogUsageSheet } from '@/components/log-usage-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { NavHeader } from '@/components/ui/nav-header';
import { Spacing } from '@/constants/theme';
import { deleteUsage, listSubstances, usageForDate } from '@/db/substances';
import { type UsageEventWithSubstance } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { addDays, formatTime, friendlyDate, todayKey } from '@/lib/dates';

export default function TodayScreen() {
  const bottomPadding = useTabContentPadding();
  const [date, setDate] = useState(todayKey());
  const [usageOpen, setUsageOpen] = useState(false);

  const { data, reload, db } = useDbData(
    async (db) => {
      const [substances, usage] = await Promise.all([listSubstances(db), usageForDate(db, date)]);
      return { substances, usage };
    },
    [date],
  );

  const dayTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const u of data?.usage ?? []) {
      map.set(u.substanceId, (map.get(u.substanceId) ?? 0) + u.amount);
    }
    return map;
  }, [data]);

  const timedEvents = (data?.usage ?? []).filter((u) => u.timestampMs !== null);
  const untimedEvents = (data?.usage ?? []).filter((u) => u.timestampMs === null);

  const confirmDeleteUsage = (u: UsageEventWithSubstance) => {
    Alert.alert('Delete entry?', `${u.substanceName} — ${u.amount}${u.unit}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteUsage(db, u.id);
          reload();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <NavHeader
          label={friendlyDate(date)}
          onPrev={() => setDate(addDays(date, -1))}
          onNext={() => setDate(addDays(date, 1))}
          onPressLabel={date === todayKey() ? undefined : () => setDate(todayKey())}
        />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          {timedEvents.length === 0 && untimedEvents.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Nothing logged {date === todayKey() ? 'today' : 'this day'}.
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              {timedEvents.map((u) => (
                <Pressable key={u.id} onPress={() => confirmDeleteUsage(u)} style={styles.usageRow}>
                  <ThemedText type="code" themeColor="textSecondary" style={styles.usageTime}>
                    {formatTime(u.timestampMs!)}
                  </ThemedText>
                  <ThemedText type="small" style={styles.usageName}>
                    {u.substanceName}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {u.amount}
                    {u.unit}
                  </ThemedText>
                  {u.route ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {u.route}
                    </ThemedText>
                  ) : null}
                </Pressable>
              ))}
              {untimedEvents.map((u) => (
                <Pressable key={u.id} onPress={() => confirmDeleteUsage(u)} style={styles.usageRow}>
                  <ThemedText type="code" themeColor="textSecondary" style={styles.usageTime}>
                    total
                  </ThemedText>
                  <ThemedText type="small" style={styles.usageName}>
                    {u.substanceName}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {u.amount}
                    {u.unit}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          )}
          <Button label="+ Log usage" onPress={() => setUsageOpen(true)} />
        </ScrollView>
      </SafeAreaView>

      <LogUsageSheet
        visible={usageOpen}
        substances={data?.substances ?? []}
        forDate={date}
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
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  usageTime: {
    minWidth: 56,
  },
  usageName: {
    flex: 1,
  },
});
