import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ItemEditorSheet } from '@/components/item-editor-sheet';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { exportBackup, importBackup, parseBackup } from '@/db/backup';
import { exportCsvSummary } from '@/db/csv';
import { listItems } from '@/db/items';
import { type Item } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { todayKey } from '@/lib/dates';

export default function SettingsScreen() {
  const bottomPadding = useTabContentPadding();
  const { data: items, reload, db } = useDbData((db) => listItems(db, true));

  const [sheet, setSheet] = useState<{ open: boolean; item: Item | null }>({
    open: false,
    item: null,
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
        // Android file providers often label .json as octet-stream or
        // text/plain, which greys the file out under a strict json filter.
        // parseBackup() validates the contents anyway.
        type: ['application/json', 'text/plain', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const backup = parseBackup(await new File(result.assets[0].uri).text());
      Alert.alert(
        'Replace all data?',
        `This backup contains ${backup.items.length} items and ${backup.intake_events.length} entries (exported ${backup.exportedAt.slice(0, 10)}). Importing REPLACES everything currently in the app.`,
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
                  `Restored ${counts.items} items, ${counts.events} usage entries, and ${counts.days} no-use days.`,
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
    <Screen>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            THINGS I TAKE
          </ThemedText>
          {(items ?? []).map((item) => (
            <Pressable key={item.id} onPress={() => setSheet({ open: true, item })}>
              <GlassCard style={[styles.row, item.archived && styles.archived]}>
                <ThemedText style={styles.rowName}>
                  {item.name}
                  {item.archived ? '  (archived)' : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.unit}
                  {item.defaultAmount !== null ? ` · usually ${item.defaultAmount}` : ''}
                  {item.dailyTotalOnly ? ' · daily total' : ''}
                  {item.trackTimeSince ? ' · time since' : ''}
                </ThemedText>
              </GlassCard>
            </Pressable>
          ))}
          {(items ?? []).length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Items you add here become available to log on the Today tab.
            </ThemedText>
          ) : null}
          <Button label="+ Add item" onPress={() => setSheet({ open: true, item: null })} />

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            DATA
          </ThemedText>
          <Button label="Export data…" variant="secondary" onPress={onExport} />
          <Button label="Export CSV summary…" variant="secondary" onPress={onExportCsv} />
          <Button label="Import data…" variant="secondary" onPress={onImport} />
          <ThemedText type="small" themeColor="textSecondary">
            Export saves a JSON backup via the share sheet (Files, AirDrop, …); Import restores one
            onto a fresh install, replacing whatever is here. The CSV summary is a one-way export of
            daily and weekly totals per item for spreadsheets.
          </ThemedText>
        </ScrollView>

      <ItemEditorSheet
        visible={sheet.open}
        item={sheet.item}
        onClose={() => setSheet({ open: false, item: null })}
        onSaved={reload}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    padding: Spacing.three,
  },
  rowName: {
    flex: 1,
  },
  archived: {
    opacity: 0.5,
  },
});
