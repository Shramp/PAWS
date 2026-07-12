import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Labeled text input used in form sheets. */
export function TextField({ label, ...inputProps }: TextInputProps & { label?: string }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...inputProps}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
          inputProps.style,
        ]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 16,
  },
});
