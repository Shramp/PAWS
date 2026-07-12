import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogUsageSheet } from '@/components/log-usage-sheet';
import { MeasureSheet } from '@/components/measure-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { NavHeader } from '@/components/ui/nav-header';
import { PromptSheet } from '@/components/ui/prompt-sheet';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { deleteUsage, listSubstances, usageForDate } from '@/db/substances';
import {
  addPickOption,
  clearDailyValue,
  entriesForDate,
  listTrackers,
  setDailyValue,
  togglePick,
} from '@/db/trackers';
import {
  type DailyEntry,
  type MeasureValue,
  type Tracker,
  type UsageEventWithSubstance,
} from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTheme } from '@/hooks/use-theme';
import { optionColor, scaleColor } from '@/lib/colors';
import { addDays, formatTime, friendlyDate, todayKey } from '@/lib/dates';

export default function TodayScreen() {
  const [date, setDate] = useState(todayKey());
  const [usageOpen, setUsageOpen] = useState(false);
  const [measureTracker, setMeasureTracker] = useState<Tracker | null>(null);
  const [promptTracker, setPromptTracker] = useState<Tracker | null>(null);

  const { data, reload, db } = useDbData(
    async (db) => {
      const [trackers, entries, substances, usage] = await Promise.all([
        listTrackers(db),
        entriesForDate(db, date),
        listSubstances(db),
        usageForDate(db, date),
      ]);
      return { trackers, entries, substances, usage };
    },
    [date],
  );

  const entriesByTracker = useMemo(() => {
    const map = new Map<number, DailyEntry[]>();
    for (const e of data?.entries ?? []) {
      const list = map.get(e.trackerId) ?? [];
      list.push(e);
      map.set(e.trackerId, list);
    }
    return map;
  }, [data]);

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

  const measureExisting = useMemo<MeasureValue | null>(() => {
    if (!measureTracker) return null;
    const entry = entriesByTracker.get(measureTracker.id)?.[0];
    return entry ? (JSON.parse(entry.value) as MeasureValue) : null;
  }, [measureTracker, entriesByTracker]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <NavHeader
          label={friendlyDate(date)}
          onPrev={() => setDate(addDays(date, -1))}
          onNext={() => setDate(addDays(date, 1))}
          onPressLabel={date === todayKey() ? undefined : () => setDate(todayKey())}
        />
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            SUBSTANCES
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            {timedEvents.length === 0 && untimedEvents.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing logged {date === todayKey() ? 'today' : 'this day'}.
              </ThemedText>
            ) : (
              <>
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
              </>
            )}
            <Button label="+ Log usage" onPress={() => setUsageOpen(true)} />
          </ThemedView>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            DAILY
          </ThemedText>
          {(data?.trackers ?? []).map((tracker) => (
            <TrackerCard
              key={tracker.id}
              tracker={tracker}
              entries={entriesByTracker.get(tracker.id) ?? []}
              onToggleBool={async (isSet) => {
                if (isSet) await clearDailyValue(db, tracker.id, date);
                else await setDailyValue(db, tracker.id, date, '1');
                reload();
              }}
              onPickScale={async (option, wasSelected) => {
                if (wasSelected) await clearDailyValue(db, tracker.id, date);
                else await setDailyValue(db, tracker.id, date, option);
                reload();
              }}
              onTogglePick={async (option) => {
                await togglePick(db, tracker.id, date, option);
                reload();
              }}
              onAddPickOption={() => setPromptTracker(tracker)}
              onOpenMeasure={() => setMeasureTracker(tracker)}
            />
          ))}
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
      <MeasureSheet
        tracker={measureTracker}
        existing={measureExisting}
        forDate={date}
        onClose={() => setMeasureTracker(null)}
        onSaved={reload}
      />
      <PromptSheet
        visible={promptTracker !== null}
        title="New category"
        placeholder="e.g. swim"
        onClose={() => setPromptTracker(null)}
        onSubmit={async (text) => {
          if (!promptTracker) return;
          const option = text.toLowerCase();
          await addPickOption(db, promptTracker, option);
          await togglePick(db, promptTracker.id, date, option);
          reload();
        }}
      />
    </ThemedView>
  );
}

function TrackerCard({
  tracker,
  entries,
  onToggleBool,
  onPickScale,
  onTogglePick,
  onAddPickOption,
  onOpenMeasure,
}: {
  tracker: Tracker;
  entries: DailyEntry[];
  onToggleBool: (isSet: boolean) => void;
  onPickScale: (option: string, wasSelected: boolean) => void;
  onTogglePick: (option: string) => void;
  onAddPickOption: () => void;
  onOpenMeasure: () => void;
}) {
  const theme = useTheme();

  if (tracker.shape === 'bool') {
    const isSet = entries.length > 0;
    return (
      <Pressable onPress={() => onToggleBool(isSet)}>
        <ThemedView type="backgroundElement" style={[styles.card, styles.rowCard]}>
          <ThemedText>{tracker.name}</ThemedText>
          <View
            style={[
              styles.check,
              isSet
                ? { backgroundColor: theme.accent }
                : { borderWidth: 2, borderColor: theme.textSecondary },
            ]}>
            {isSet ? <ThemedText style={{ color: theme.onAccent, fontSize: 14 }}>✓</ThemedText> : null}
          </View>
        </ThemedView>
      </Pressable>
    );
  }

  if (tracker.shape === 'scale') {
    const options = tracker.config.options ?? [];
    const selected = entries[0]?.value ?? null;
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText>{tracker.name}</ThemedText>
        <View style={styles.chips}>
          {options.map((option, i) => (
            <Chip
              key={option}
              label={option}
              selected={selected === option}
              color={scaleColor(i, options.length)}
              onPress={() => onPickScale(option, selected === option)}
            />
          ))}
        </View>
      </ThemedView>
    );
  }

  if (tracker.shape === 'multi_pick') {
    const options = tracker.config.options ?? [];
    const picked = new Set(entries.map((e) => e.value));
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText>{tracker.name}</ThemedText>
        <View style={styles.chips}>
          {options.map((option, i) => (
            <Chip
              key={option}
              label={option}
              selected={picked.has(option)}
              color={optionColor(i)}
              onPress={() => onTogglePick(option)}
            />
          ))}
          {tracker.config.allowCustom ? <Chip label="+ new" onPress={onAddPickOption} /> : null}
        </View>
      </ThemedView>
    );
  }

  // measure
  const value = entries[0] ? (JSON.parse(entries[0].value) as MeasureValue) : null;
  return (
    <Pressable onPress={onOpenMeasure}>
      <ThemedView type="backgroundElement" style={[styles.card, styles.rowCard]}>
        <ThemedText>{tracker.name}</ThemedText>
        {value ? (
          <ThemedText type="smallBold">
            {value.v}
            {tracker.config.valueUnit ?? ''} · {value.r}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            log —
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
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
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    letterSpacing: 1,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
