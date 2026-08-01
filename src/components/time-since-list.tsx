import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Spacing } from '@/constants/theme';
import { type TimeSinceItem } from '@/db/types';
import { formatElapsed } from '@/lib/dates';

/**
 * "Time since last X" rows for items configured to track it. Re-renders once
 * a minute — the display granularity is minutes, so ticking faster would just
 * burn cycles.
 */
export function TimeSinceList({ items }: { items: TimeSinceItem[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (items.length === 0) return;
    // Align the first tick to the next minute boundary so the value never
    // sits visibly stale, then settle into a steady 60s cadence.
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(
      () => {
        setNow(Date.now());
        interval = setInterval(() => setNow(Date.now()), 60_000);
      },
      60_000 - (Date.now() % 60_000),
    );
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <GlassCard style={styles.card}>
      {items.map((item) => (
        <View key={item.itemId} style={styles.row}>
          <ThemedText type="small" style={styles.label}>
            Time since last {item.itemName}
          </ThemedText>
          <ThemedText type="smallBold">
            {item.lastTimestampMs === null ? '—' : formatElapsed(item.lastTimestampMs, now)}
          </ThemedText>
        </View>
      ))}
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  label: {
    flex: 1,
  },
});
