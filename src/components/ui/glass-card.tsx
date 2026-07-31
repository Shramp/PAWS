import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const hasGlass = isLiquidGlassAvailable();

/**
 * Card surface: native liquid glass on iOS 26+, a solid themed card
 * everywhere else (older iOS, Android). Same layout either way.
 */
export function GlassCard({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  if (hasGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor="rgba(30, 24, 44, 0.5)"
        colorScheme="dark"
        style={[styles.card, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
});
