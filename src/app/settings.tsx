import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubstanceEditorSheet } from '@/components/substance-editor-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { exportBackup, importBackup, parseBackup } from '@/db/backup';
import { exportCsvSummary } from '@/db/csv';
import { listSubstances } from '@/db/substances';
import { type Substance } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { todayKey } from '@/lib/dates';

export default function SettingsScreen() {
  const bottomPadding = useTabContentPadding();
  const { data: substances, reload, db } = useDbData((db) => listSubstances(db, true));

  const [sheet, setSheet] = useState<{ open: boolean; substance: Substance | null }>({
    open: false,
    substance: null,
  });

  const onExport = async () => {
    try {
      const json = await exportBackup(db);
      const file = new File(Paths.cache, `paws-backup-${todayKey()}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(json);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export PAWS data',
        UTI: 'public.json',
      });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    }
  };

  const onExportCsv = async () => {
    try {
      const csv = await exportCsvSummary(db);
      const file = new File(Paths.cache, `paws-summary-${todayKey()}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export PAWS summary (CSV)',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    }
  };

  const onImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const backup = parseBackup(await new File(result.assets[0].uri).text());
      Alert.alert(
        'Replace all data?',
        `This backup contains ${backup.substances.length} substances and ${backup.usage_events.length} usage entries (exported ${backup.exportedAt.slice(0, 10)}). Importing REPLACES everything currently in the app.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              try {
                const counts = await importBackup(db, backup);
                reload();
                Alert.alert(
                  'Import complete',
                  `Restored ${counts.substances} substances, ${counts.events} usage entries, and ${counts.days} no-use days.`,
                );
              } catch (e) {
                Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    }
  };

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

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            DATA
          </ThemedText>
          <Button label="Export data…" variant="secondary" onPress={onExport} />
          <Button label="Export CSV summary…" variant="secondary" onPress={onExportCsv} />
          <Button label="Import data…" variant="secondary" onPress={onImport} />
          <ThemedText type="small" themeColor="textSecondary">
            Export saves a JSON backup via the share sheet (Files, AirDrop, …); Import restores one
            onto a fresh install, replacing whatever is here. The CSV summary is a one-way export of
            daily and weekly totals per substance for spreadsheets.
          </ThemedText>
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
