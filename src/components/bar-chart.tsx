import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BarDatum {
  key: string;
  /** short label under the bar, e.g. day-of-month or week start */
  label: string;
  /** month abbreviation at month boundaries — kept visible even when labels thin out */
  monthMark?: string;
  total: number;
  /** zero is affirmed data (tracked period) — rendered as a stub, unlike unknown gaps */
  trackedZero?: boolean;
}

const PLOT_HEIGHT = 180;
const MIN_LABEL_WIDTH = 20;

/**
 * Single-series bar chart that always fits its container width — longer
 * ranges mean thinner bars, never horizontal scrolling. Per-bar labels thin
 * out to every-Nth as columns narrow; month marks stay. Tap a bar to select
 * it (selected bar fills in text color; details belong in the header above).
 */
export function BarChart({
  data,
  selectedKey,
  onSelect,
}: {
  data: BarDatum[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(...data.map((d) => d.total), 0);

  const colWidth = width > 0 && data.length > 0 ? width / data.length : 0;
  const labelEvery = colWidth > 0 ? Math.max(1, Math.ceil(MIN_LABEL_WIDTH / colWidth)) : 1;
  // Drop any month mark that would land within ~28px of the previous kept one.
  const marks: { key: string; monthMark: string; index: number }[] = [];
  if (colWidth > 0) {
    let lastKeptX = -Infinity;
    data.forEach((d, i) => {
      if (d.monthMark === undefined) return;
      const x = i * colWidth;
      if (x - lastKeptX >= 28) {
        marks.push({ key: d.key, monthMark: d.monthMark, index: i });
        lastKeptX = x;
      }
    });
  }

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.plotRow}>
        {data.map((d) => {
          const barHeight = max > 0 && d.total > 0 ? Math.max((d.total / max) * PLOT_HEIGHT, 3) : 0;
          const isSelected = d.key === selectedKey;
          return (
            <Pressable key={d.key} onPress={() => onSelect(d.key)} style={styles.column}>
              {d.total > 0 ? (
                <View
                  style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: isSelected ? theme.text : theme.accent },
                  ]}
                />
              ) : d.trackedZero ? (
                // affirmed zero: a teal stub distinguishes "measured 0" from "no data"
                <View style={[styles.zeroStub, { backgroundColor: theme.accentSecondary }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.baseline, { backgroundColor: theme.backgroundSelected }]} />
      <View style={styles.labelRow}>
        {width > 0
          ? data.map((d, i) =>
              i % labelEvery === 0 ? (
                <ThemedText
                  key={d.key}
                  type="code"
                  themeColor={d.key === selectedKey ? 'text' : 'textSecondary'}
                  style={[styles.periodLabel, { left: i * colWidth }]}>
                  {d.label}
                </ThemedText>
              ) : null,
            )
          : null}
      </View>
      {marks.length > 0 ? (
        <View style={styles.labelRow}>
          {marks.map((m) => (
            <ThemedText
              key={m.key}
              type="code"
              themeColor="textSecondary"
              style={[styles.periodLabel, { left: m.index * colWidth }]}>
              {m.monthMark}
            </ThemedText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plotRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: PLOT_HEIGHT,
  },
  column: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    alignSelf: 'center',
    width: '68%',
    minWidth: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  zeroStub: {
    alignSelf: 'center',
    width: '68%',
    minWidth: 2,
    height: 2,
    borderRadius: 1,
  },
  baseline: {
    height: 1,
    alignSelf: 'stretch',
  },
  labelRow: {
    height: 14,
    marginTop: Spacing.one,
  },
  periodLabel: {
    position: 'absolute',
    fontSize: 10,
    lineHeight: 13,
  },
});
