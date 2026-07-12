import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { clearDailyValue, setDailyValue } from '@/db/trackers';
import { type MeasureValue, type Tracker } from '@/db/types';
import { scaleColor } from '@/lib/colors';

/** Editor for a "measure" tracker (number + rating), e.g. Sleep. */
export function MeasureSheet({
  tracker,
  ...props
}: {
  tracker: Tracker | null;
  existing: MeasureValue | null;
  forDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mount fresh per tracker so state initializes from `existing`.
  if (!tracker) return null;
  return <MeasureSheetContent key={tracker.id} tracker={tracker} {...props} />;
}

function MeasureSheetContent({
  tracker,
  existing,
  forDate,
  onClose,
  onSaved,
}: {
  tracker: Tracker;
  existing: MeasureValue | null;
  forDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const [valueText, setValueText] = useState(existing ? String(existing.v) : '');
  const [rating, setRating] = useState<string | null>(existing ? existing.r : null);

  const ratingOptions = tracker.config.ratingOptions ?? [];
  const value = parseFloat(valueText.replace(',', '.'));
  const valid = !isNaN(value) && value >= 0 && rating !== null;

  const save = async () => {
    if (!valid || rating === null) return;
    const payload: MeasureValue = { v: value, r: rating };
    await setDailyValue(db, tracker.id, forDate, JSON.stringify(payload));
    onSaved();
    onClose();
  };

  const clear = async () => {
    await clearDailyValue(db, tracker.id, forDate);
    onSaved();
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={tracker.name}>
      <TextField
        label={`${tracker.config.valueLabel ?? 'Value'}${tracker.config.valueUnit ? ` (${tracker.config.valueUnit})` : ''}`}
        value={valueText}
        onChangeText={setValueText}
        keyboardType="decimal-pad"
        placeholder="7.5"
        autoFocus
      />
      <ThemedText type="small" themeColor="textSecondary">
        Quality
      </ThemedText>
      <View style={styles.chips}>
        {ratingOptions.map((option, i) => (
          <Chip
            key={option}
            label={option}
            selected={rating === option}
            color={scaleColor(i, ratingOptions.length)}
            onPress={() => setRating(option)}
          />
        ))}
      </View>
      <Button label="Save" onPress={save} disabled={!valid} />
      {existing ? <Button label="Clear entry" variant="secondary" onPress={clear} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
