import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** ‹ label › stepper used for day / week / month navigation. */
export function NavHeader({
  label,
  onPrev,
  onNext,
  onPressLabel,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onPressLabel?: () => void;
}) {
  return (
    <ThemedView style={styles.row}>
      <Pressable onPress={onPrev} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="subtitle" style={styles.arrow}>
          ‹
        </ThemedText>
      </Pressable>
      <Pressable onPress={onPressLabel} disabled={!onPressLabel} hitSlop={8}>
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
      </Pressable>
      <Pressable onPress={onNext} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="subtitle" style={styles.arrow}>
          ›
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  arrow: {
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 17,
  },
  pressed: {
    opacity: 0.5,
  },
});
