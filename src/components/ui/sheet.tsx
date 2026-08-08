import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Drag distance past which releasing dismisses the sheet. */
const DISMISS_THRESHOLD = 80;
/** Downward fling speed (px/s) that dismisses regardless of distance. */
const DISMISS_VELOCITY = 600;
/** Vertical slop before the pan activates, so taps still land on buttons. */
const PAN_ACTIVATION_SLOP = 10;

/**
 * Bottom-sheet style modal used for all entry/edit forms.
 *
 * `footer` renders pinned below the content so primary actions stay reachable
 * regardless of form height or keyboard state. The whole sheet is draggable:
 * the pan runs on the native thread via gesture-handler, so it tracks the
 * finger 1:1 and catches fast flicks that a JS-thread responder would miss.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  scrollable = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned action row, always visible below the content. */
  footer?: ReactNode;
  /**
   * Let tall forms scroll. Off by default: a scroll view competes with the
   * drag-to-dismiss pan, so only forms that genuinely overflow opt in.
   */
  scrollable?: boolean;
}) {
  const theme = useTheme();
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    // Only take over after a clear downward drag; taps and horizontal
    // movement stay with the children underneath.
    .activeOffsetY([-PAN_ACTIVATION_SLOP, PAN_ACTIVATION_SLOP])
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        // Carry the fling through, then unmount once it's offscreen.
        translateY.value = withTiming(700, { duration: 180 }, (done) => {
          if (done) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 260 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Modal renders in its own native hierarchy, so gestures inside it
          need their own root view. */}
      <GestureHandlerRootView style={styles.root}>
        <KeyboardAvoidingView
          style={styles.backdropContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <Animated.View style={[scrollable && styles.animatorCapped, sheetStyle]}>
            <GlassCard style={styles.sheet}>
              {/* On a scrolling sheet only the header drags, so the pan can
                  never be confused with a scroll. Otherwise the whole sheet
                  is a drag target, since nothing inside owns vertical pans. */}
              <GestureDetector gesture={pan}>
                <View style={scrollable ? undefined : styles.fill}>
                  <View style={[styles.grabber, { backgroundColor: theme.textSecondary }]} />
                  <ThemedText type="subtitle" style={styles.title}>
                    {title}
                  </ThemedText>
                  {scrollable ? null : (
                    <>
                      <View style={styles.content}>{children}</View>
                      {footer ? <View style={styles.footer}>{footer}</View> : null}
                    </>
                  )}
                </View>
              </GestureDetector>
              {scrollable ? (
                <>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    // Without a footer below it, the scroll content needs its
                    // own bottom padding or the last row sits flush against
                    // the sheet edge.
                    contentContainerStyle={[styles.content, !footer && styles.contentBottomPad]}
                    style={styles.scroll}>
                    {children}
                  </ScrollView>
                  {footer ? <View style={styles.footer}>{footer}</View> : null}
                </>
              ) : null}
            </GlassCard>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  /** Height cap for scrollable sheets; unscrollable ones size to content. */
  animatorCapped: {
    maxHeight: '85%',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: Spacing.two,
    flexShrink: 1,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  fill: {
    flexShrink: 1,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  /**
   * Footerless sheets end at the content, so the last row would sit against
   * the card's rounded bottom edge and read as cut off. Matches the breathing
   * room the footer otherwise provides.
   */
  contentBottomPad: {
    paddingBottom: Spacing.five,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
});
