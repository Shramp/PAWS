import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/dates';

/**
 * Time input that stays collapsed until you need it.
 *
 * The value defaults to "now" when logging today, which is right most of the
 * time, so an always-open spinner spent ~200px of sheet height on the field
 * edited least often — pushing amount and route around and forcing the sheet
 * to scroll. Collapsed by default, the whole form fits without scrolling.
 *
 * iOS   — tapping the summary row expands an inline wheel spinner.
 * Android — tapping opens the system clock dialog. The component form of
 *   DateTimePicker *is* that dialog on Android and opens the moment it
 *   mounts, so it's rendered only while open and torn down on dismiss.
 */
export function TimeField({
  value,
  onChange,
  /** Extra note shown beside the label, e.g. the late-night day-start rule. */
  hint,
}: {
  value: Date;
  onChange: (next: Date) => void;
  hint?: string;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const openAndroid = () =>
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      onChange: (event, selected) => {
        if (event.type === 'set' && selected) onChange(selected);
      },
    });

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => (Platform.OS === 'android' ? openAndroid() : setExpanded((e) => !e))}
        style={({ pressed }) => [
          styles.summary,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <View style={styles.labelGroup}>
          <ThemedText type="small" themeColor="textSecondary">
            Time
          </ThemedText>
          {hint ? (
            <ThemedText type="small" themeColor="textSecondary">
              {hint}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.valueGroup}>
          <ThemedText type="smallBold">{formatTime(value.getTime())}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {Platform.OS === 'android' ? 'change' : expanded ? 'done' : 'change'}
          </ThemedText>
        </View>
      </Pressable>

      {expanded && Platform.OS !== 'android' ? (
        <DateTimePicker
          value={value}
          mode="time"
          display="spinner"
          themeVariant="dark"
          style={styles.iosPicker}
          onChange={(_, selected) => {
            if (selected) onChange(selected);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    gap: Spacing.two,
  },
  labelGroup: {
    flexShrink: 1,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  iosPicker: {
    alignSelf: 'center',
  },
});
