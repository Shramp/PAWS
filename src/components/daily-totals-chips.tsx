import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { type ItemTotal } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

/** Trim float noise: 2.5 stays 2.5, 215.0 becomes 215. */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The day's total per item as a wrapping row of chips — a summary, visually
 * distinct from the event list below it. Renders nothing when the day is empty.
 */
export function DailyTotalsChips({ totals }: { totals: ItemTotal[] }) {
  const theme = useTheme();

  if (totals.length === 0) return null;

  return (
    <View style={styles.row}>
      {totals.map((total) => (
        <View key={total.itemId} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {total.itemName}
          </ThemedText>
          <ThemedText type="smallBold">
            {round(total.total)}
            {total.unit}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
});
