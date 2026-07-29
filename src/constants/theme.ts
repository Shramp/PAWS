/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * PAWS palette: always-dark plum base with pastel accents.
 * accent (pink) marks usage; accentSecondary (teal) marks confirmed zeros.
 * `light` is kept type-compatible but the app renders dark everywhere.
 */
export const Colors = {
  light: {
    text: '#231D31',
    background: '#FBF8FC',
    backgroundElement: '#F2EDF6',
    backgroundSelected: '#E5DCEE',
    textSecondary: '#6C6187',
    accent: '#D2699F',
    onAccent: '#FFFFFF',
    accentSecondary: '#1FA48E',
    danger: '#C74A6B',
  },
  dark: {
    text: '#F3EFFA',
    background: '#171320',
    backgroundElement: '#231D31',
    backgroundSelected: '#332A47',
    textSecondary: '#A79DC2',
    accent: '#F0A3C6',
    onAccent: '#331526',
    accentSecondary: '#7ED9C8',
    danger: '#E56D8A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
