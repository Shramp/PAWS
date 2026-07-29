import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { monthGrid, todayKey, WEEKDAY_LABELS } from '@/lib/dates';

/**
 * Month calendar grid (Monday-first). `renderDay` supplies the cell content
 * below the day number — a dot, value, glyph, etc. Days are tappable when
 * `onPressDay` is given; `selectedDay` gets a ring.
 */
export function MonthGrid({
  year,
  month,
  renderDay,
  onPressDay,
  selectedDay,
}: {
  year: number;
  month: number;
  renderDay: (dateKey: string) => ReactNode;
  onPressDay?: (dateKey: string) => void;
  selectedDay?: string | null;
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
            <Pressable
              key={key ?? `blank-${j}`}
              disabled={!key || !onPressDay}
              onPress={() => key && onPressDay?.(key)}
              style={[
                styles.cell,
                key === today && { backgroundColor: theme.backgroundElement },
                key != null && key === selectedDay && { borderWidth: 2, borderColor: theme.accent },
              ]}>
              {key ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.dayNum}>
                    {Number(key.slice(8))}
                  </ThemedText>
                  <View style={styles.dayContent}>{renderDay(key)}</View>
                </>
              ) : null}
            </Pressable>
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
    borderRadius: Spacing.two,
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
