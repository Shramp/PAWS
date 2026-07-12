import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubstanceEditorSheet } from '@/components/substance-editor-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrackerEditorSheet } from '@/components/tracker-editor-sheet';
import { Button } from '@/components/ui/button';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { listSubstances } from '@/db/substances';
import { listTrackers } from '@/db/trackers';
import { type Substance, type Tracker, type TrackerShape } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';

const SHAPE_NAMES: Record<TrackerShape, string> = {
  bool: 'yes / no',
  scale: 'scale',
  multi_pick: 'multi-choice',
  measure: 'number + rating',
};

export default function SettingsScreen() {
  const { data, reload } = useDbData(async (db) => {
    const [trackers, substances] = await Promise.all([listTrackers(db, true), listSubstances(db, true)]);
    return { trackers, substances };
  });

  const [trackerSheet, setTrackerSheet] = useState<{ open: boolean; tracker: Tracker | null }>({
    open: false,
    tracker: null,
  });
  const [substanceSheet, setSubstanceSheet] = useState<{ open: boolean; substance: Substance | null }>({
    open: false,
    substance: null,
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            TRACKERS
          </ThemedText>
          {(data?.trackers ?? []).map((tracker) => (
            <Pressable key={tracker.id} onPress={() => setTrackerSheet({ open: true, tracker })}>
              <ThemedView type="backgroundElement" style={[styles.row, tracker.archived && styles.archived]}>
                <ThemedText style={styles.rowName}>
                  {tracker.name}
                  {tracker.archived ? '  (archived)' : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {SHAPE_NAMES[tracker.shape]}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
          <Button label="+ Add tracker" onPress={() => setTrackerSheet({ open: true, tracker: null })} />

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            SUBSTANCES
          </ThemedText>
          {(data?.substances ?? []).map((substance) => (
            <Pressable key={substance.id} onPress={() => setSubstanceSheet({ open: true, substance })}>
              <ThemedView type="backgroundElement" style={[styles.row, substance.archived && styles.archived]}>
                <ThemedText style={styles.rowName}>
                  {substance.name}
                  {substance.archived ? '  (archived)' : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {substance.unit}
                  {substance.dailyTotalOnly ? ' · daily total' : ''}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
          {(data?.substances ?? []).length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Substances you add here become available to log on the Today tab.
            </ThemedText>
          ) : null}
          <Button label="+ Add substance" onPress={() => setSubstanceSheet({ open: true, substance: null })} />
        </ScrollView>
      </SafeAreaView>

      <TrackerEditorSheet
        visible={trackerSheet.open}
        tracker={trackerSheet.tracker}
        onClose={() => setTrackerSheet({ open: false, tracker: null })}
        onSaved={reload}
      />
      <SubstanceEditorSheet
        visible={substanceSheet.open}
        substance={substanceSheet.substance}
        onClose={() => setSubstanceSheet({ open: false, substance: null })}
        onSaved={reload}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Spacing.two,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rowName: {
    flex: 1,
  },
  archived: {
    opacity: 0.5,
  },
});
