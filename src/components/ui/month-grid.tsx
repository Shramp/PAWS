import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { monthGrid, todayKey, WEEKDAY_LABELS } from '@/lib/dates';

/**
 * Month calendar grid (Monday-first). `renderDay` supplies the cell content
 * below the day number — a dot, value, glyph, etc.
 */
export function MonthGrid({
  year,
  month,
  renderDay,
}: {
  year: number;
  month: number;
  renderDay: (dateKey: string) => ReactNode;
}) {
  const theme = useTheme();
  const weeks = monthGrid(year, month);
  const today = todayKey();

  return (
    <View style={styles.grid}>
      <View style={styles.week}>
        {WEEKDAY_LABELS.map((wd) => (
          <View key={wd} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary">
              {wd[0]}
            </ThemedText>
          </View>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={styles.week}>
          {week.map((key, j) => (
            <View
              key={key ?? `blank-${j}`}
              style={[
                styles.cell,
                key === today && { backgroundColor: theme.backgroundElement, borderRadius: Spacing.two },
              ]}>
              {key ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.dayNum}>
                    {Number(key.slice(8))}
                  </ThemedText>
                  <View style={styles.dayContent}>{renderDay(key)}</View>
                </>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  week: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  cell: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  dayNum: {
    fontSize: 11,
    lineHeight: 14,
  },
  dayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
