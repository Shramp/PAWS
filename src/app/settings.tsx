import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubstanceEditorSheet } from '@/components/substance-editor-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { listSubstances } from '@/db/substances';
import { type Substance } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';

export default function SettingsScreen() {
  const bottomPadding = useTabContentPadding();
  const { data: substances, reload } = useDbData((db) => listSubstances(db, true));

  const [sheet, setSheet] = useState<{ open: boolean; substance: Substance | null }>({
    open: false,
    substance: null,
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            SUBSTANCES
          </ThemedText>
          {(substances ?? []).map((substance) => (
            <Pressable key={substance.id} onPress={() => setSheet({ open: true, substance })}>
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
          {(substances ?? []).length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Substances you add here become available to log on the Today tab.
            </ThemedText>
          ) : null}
          <Button label="+ Add substance" onPress={() => setSheet({ open: true, substance: null })} />
        </ScrollView>
      </SafeAreaView>

      <SubstanceEditorSheet
        visible={sheet.open}
        substance={sheet.substance}
        onClose={() => setSheet({ open: false, substance: null })}
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
