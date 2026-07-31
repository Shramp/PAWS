import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Spacing } from '@/constants/theme';
import { deleteUsage } from '@/db/substances';
import { type UsageEventWithSubstance } from '@/db/types';
import { formatTime } from '@/lib/dates';

/**
 * One day's usage events as a card: timestamped entries chronologically,
 * then daily-total entries. Tap a row to delete it.
 */
export function UsageList({
  events,
  emptyLabel,
  onChanged,
}: {
  events: UsageEventWithSubstance[];
  emptyLabel: string;
  onChanged: () => void;
}) {
  const db = useSQLiteContext();

  const confirmDelete = (u: UsageEventWithSubstance) => {
    Alert.alert('Delete entry?', `${u.substanceName} — ${u.amount}${u.unit}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteUsage(db, u.id);
          onChanged();
        },
      },
    ]);
  };

  return (
    <GlassCard style={styles.card}>
      {events.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      ) : (
        events.map((u) => (
          <Pressable key={u.id} onPress={() => confirmDelete(u)} style={styles.row}>
            <ThemedText type="code" themeColor="textSecondary" style={styles.time}>
              {u.timestampMs !== null ? formatTime(u.timestampMs) : 'total'}
            </ThemedText>
            <ThemedText type="small" style={styles.name}>
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
        ))
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  time: {
    minWidth: 56,
  },
  name: {
    flex: 1,
  },
});
