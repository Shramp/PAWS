import { Colors } from '@/constants/theme';

/** PAWS is an always-dark app — the palette does not follow the system scheme. */
export function useTheme() {
  return Colors.dark;
}
