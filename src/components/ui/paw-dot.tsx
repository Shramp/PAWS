import { StyleSheet, View } from 'react-native';

/** Tiny paw print: a pad with three toes. Used as the calendar's usage marker. */
export function PawDot({ size = 12, color }: { size?: number; color: string }) {
  const s = size / 12; // scale factor from the 12px design grid
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.abs,
          { top: 0, left: 0.5 * s, width: 3 * s, height: 3.4 * s, borderRadius: 2 * s, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.abs,
          { top: -1 * s, left: 4.5 * s, width: 3 * s, height: 3.4 * s, borderRadius: 2 * s, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.abs,
          { top: 0, left: 8.5 * s, width: 3 * s, height: 3.4 * s, borderRadius: 2 * s, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.abs,
          {
            top: 4.2 * s,
            left: 2 * s,
            width: 8 * s,
            height: 6.5 * s,
            borderTopLeftRadius: 4 * s,
            borderTopRightRadius: 4 * s,
            borderBottomLeftRadius: 5 * s,
            borderBottomRightRadius: 5 * s,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
});
