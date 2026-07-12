import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  createTracker,
  deleteTracker,
  renameTracker,
  setTrackerArchived,
  updateTrackerConfig,
} from '@/db/trackers';
import { type Tracker, type TrackerConfig, type TrackerShape } from '@/db/types';

const SHAPE_LABELS: { shape: TrackerShape; label: string; hint: string }[] = [
  { shape: 'bool', label: 'Yes / No', hint: 'Did it happen today?' },
  { shape: 'scale', label: 'Scale', hint: 'One rating per day, e.g. terrible → amazing' },
  { shape: 'multi_pick', label: 'Multi-choice', hint: 'Zero or more categories per day, e.g. exercise' },
  { shape: 'measure', label: 'Number + rating', hint: 'A number plus a quality rating, e.g. sleep' },
];

function parseCsv(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Create a new tracker, or edit (rename / options / archive / delete) an existing one. */
export function TrackerEditorSheet({
  visible,
  ...props
}: {
  visible: boolean;
  /** null → creating a new tracker */
  tracker: Tracker | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mount fresh on each open so state initializes from the tracker being edited.
  if (!visible) return null;
  return <TrackerEditorSheetContent {...props} />;
}

function TrackerEditorSheetContent({
  tracker,
  onClose,
  onSaved,
}: {
  tracker: Tracker | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const [name, setName] = useState(tracker?.name ?? '');
  const [shape, setShape] = useState<TrackerShape>(tracker?.shape ?? 'bool');
  const [optionsText, setOptionsText] = useState((tracker?.config.options ?? []).join(', '));
  const [valueLabel, setValueLabel] = useState(tracker?.config.valueLabel ?? '');
  const [valueUnit, setValueUnit] = useState(tracker?.config.valueUnit ?? '');
  const [ratingsText, setRatingsText] = useState((tracker?.config.ratingOptions ?? []).join(', '));

  const buildConfig = (): TrackerConfig => {
    switch (shape) {
      case 'bool':
        return {};
      case 'scale':
        return { options: parseCsv(optionsText) };
      case 'multi_pick':
        return { options: parseCsv(optionsText), allowCustom: true };
      case 'measure':
        return {
          valueLabel: valueLabel.trim() || 'Value',
          valueUnit: valueUnit.trim(),
          ratingOptions: parseCsv(ratingsText),
        };
    }
  };

  const needsOptions = shape === 'scale' || shape === 'multi_pick';
  const valid =
    name.trim().length > 0 &&
    (!needsOptions || parseCsv(optionsText).length >= (shape === 'scale' ? 2 : 1)) &&
    (shape !== 'measure' || parseCsv(ratingsText).length >= 2);

  const save = async () => {
    if (!valid) return;
    if (tracker) {
      await renameTracker(db, tracker.id, name.trim());
      await updateTrackerConfig(db, tracker.id, buildConfig());
    } else {
      await createTracker(db, name.trim(), shape, buildConfig());
    }
    onSaved();
    onClose();
  };

  const toggleArchive = async () => {
    if (!tracker) return;
    await setTrackerArchived(db, tracker.id, !tracker.archived);
    onSaved();
    onClose();
  };

  const confirmDelete = () => {
    if (!tracker) return;
    Alert.alert('Delete tracker?', `“${tracker.name}” and ALL its logged entries will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: async () => {
          await deleteTracker(db, tracker.id);
          onSaved();
          onClose();
        },
      },
    ]);
  };

  return (
    <Sheet visible onClose={onClose} title={tracker ? 'Edit tracker' : 'New tracker'}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Meditate" />

      {!tracker ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Type
          </ThemedText>
          <View style={styles.chips}>
            {SHAPE_LABELS.map((s) => (
              <Chip key={s.shape} label={s.label} selected={shape === s.shape} onPress={() => setShape(s.shape)} />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {SHAPE_LABELS.find((s) => s.shape === shape)?.hint}
          </ThemedText>
        </>
      ) : null}

      {needsOptions ? (
        <TextField
          label={shape === 'scale' ? 'Options, worst → best (comma-separated)' : 'Options (comma-separated)'}
          value={optionsText}
          onChangeText={setOptionsText}
          placeholder={shape === 'scale' ? 'bad, ok, good' : 'climb, walk, dance'}
          autoCapitalize="none"
        />
      ) : null}

      {shape === 'measure' ? (
        <>
          <TextField label="Value label" value={valueLabel} onChangeText={setValueLabel} placeholder="Hours slept" />
          <TextField label="Unit" value={valueUnit} onChangeText={setValueUnit} placeholder="h" autoCapitalize="none" />
          <TextField
            label="Ratings, worst → best (comma-separated)"
            value={ratingsText}
            onChangeText={setRatingsText}
            placeholder="poor, fair, good, great"
            autoCapitalize="none"
          />
        </>
      ) : null}

      <Button label={tracker ? 'Save changes' : 'Create tracker'} onPress={save} disabled={!valid} />
      {tracker ? (
        <>
          <Button label={tracker.archived ? 'Unarchive' : 'Archive'} variant="secondary" onPress={toggleArchive} />
          <Button label="Delete…" variant="danger" onPress={confirmDelete} />
        </>
      ) : null}
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
