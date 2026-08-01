import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Spacing } from '@/constants/theme';
import { type TimeSinceItem } from '@/db/types';
import { formatElapsed } from '@/lib/dates';

/**
 * "Time since last X" hero cards for items configured to track it. Two per
 * row, wrapping — the duration is the headline, the item name the caption.
 *
 * Re-renders once a minute: the display granularity is minutes, so ticking
 * faster would just burn cycles.
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
    <View style={styles.grid}>
      {items.map((item) => (
        <GlassCard key={item.itemId} style={styles.card}>
          <ThemedText style={styles.duration} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {item.lastTimestampMs === null ? '—' : formatElapsed(item.lastTimestampMs, now)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            since {item.itemName}
          </ThemedText>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    // Two per row, growing to fill a lone trailing card. flexBasis sits just
    // under half so two cards plus the gap never overflow the row.
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 130,
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
  },
  duration: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
});
