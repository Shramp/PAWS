import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * Shared screen chrome: deep plum gradient with soft pink/teal glow blobs.
 * Gives the liquid-glass cards something colorful to refract; on non-glass
 * platforms it's simply a subtle backdrop.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1E1730', '#171320', '#110F18']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={[styles.blob, styles.blobTeal]} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#171320',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  blobPink: {
    top: -80,
    right: -100,
    backgroundColor: 'rgba(240, 163, 198, 0.13)',
  },
  blobTeal: {
    bottom: 60,
    left: -130,
    backgroundColor: 'rgba(126, 217, 200, 0.09)',
  },
  safeArea: {
    flex: 1,
    paddingTop: Spacing.two,
  },
});
