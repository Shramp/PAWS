import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Spacing } from '@/constants/theme';
import { type IntakeEventWithItem } from '@/db/types';
import { formatTime } from '@/lib/dates';

/**
 * One day's intake as a card: timestamped entries chronologically, then
 * daily-total entries. Tap a row to edit it.
 */
export function IntakeList({
  events,
  emptyLabel,
  onPressEvent,
}: {
  events: IntakeEventWithItem[];
  emptyLabel: string;
  onPressEvent: (event: IntakeEventWithItem) => void;
}) {
  return (
    <GlassCard style={styles.card}>
      {events.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      ) : (
        events.map((e) => (
          <Pressable key={e.id} onPress={() => onPressEvent(e)} style={styles.row}>
            <ThemedText type="code" themeColor="textSecondary" style={styles.time}>
              {e.timestampMs !== null ? formatTime(e.timestampMs) : 'total'}
            </ThemedText>
            <ThemedText type="small" style={styles.name}>
              {e.itemName}
            </ThemedText>
            <ThemedText type="smallBold">
              {e.amount}
              {e.unit}
            </ThemedText>
            {e.route ? (
              <ThemedText type="small" themeColor="textSecondary">
                {e.route}
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
