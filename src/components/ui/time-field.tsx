import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/dates';

/**
 * Time input that respects each platform's native idiom:
 *
 * iOS   — an inline wheel spinner, always visible.
 * Android — a tappable value that opens the system clock dialog. The
 *   component form of DateTimePicker *is* that dialog on Android and opens
 *   the moment it mounts, so rendering it inline made it reappear on every
 *   re-render (e.g. each keystroke elsewhere in the form). The imperative
 *   DateTimePickerAndroid API is what the library recommends instead.
 */
export function TimeField({ value, onChange }: { value: Date; onChange: (next: Date) => void }) {
  const theme = useTheme();

  if (Platform.OS === 'android') {
    return (
      <Pressable
        onPress={() =>
          DateTimePickerAndroid.open({
            value,
            mode: 'time',
            onChange: (event, selected) => {
              if (event.type === 'set' && selected) onChange(selected);
            },
          })
        }
        style={({ pressed }) => [
          styles.androidValue,
          { backgroundColor: theme.backgroundElement },
          pressed && { opacity: 0.7 },
        ]}>
        <ThemedText>{formatTime(value.getTime())}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          tap to change
        </ThemedText>
      </Pressable>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  iosPicker: {
    alignSelf: 'center',
  },
  androidValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
});
