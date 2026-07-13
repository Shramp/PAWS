import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';

/**
 * Bottom padding for scrollable tab content: tab bar height + the device's
 * bottom safe area (home indicator) + breathing room, so the last item can
 * scroll fully clear of the floating tab bar.
 */
export function useTabContentPadding(): number {
  const insets = useSafeAreaInsets();
  return BottomTabInset + insets.bottom + Spacing.four;
}
