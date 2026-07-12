import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { createSubstance, setSubstanceArchived, updateSubstance } from '@/db/substances';
import { ADMINISTRATION_ROUTES, type Substance } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

/** Create or edit a substance: name, unit, routes, daily-total-only. */
export function SubstanceEditorSheet({
  visible,
  ...props
}: {
  visible: boolean;
  /** null → creating a new substance */
  substance: Substance | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mount fresh on each open so state initializes from the substance being edited.
  if (!visible) return null;
  return <SubstanceEditorSheetContent {...props} />;
}

function SubstanceEditorSheetContent({
  substance,
  onClose,
  onSaved,
}: {
  substance: Substance | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [name, setName] = useState(substance?.name ?? '');
  const [unit, setUnit] = useState(substance?.unit ?? '');
  const [routes, setRoutes] = useState<string[]>(substance?.routes ?? []);
  const [dailyTotalOnly, setDailyTotalOnly] = useState(substance?.dailyTotalOnly ?? false);

  const toggleRoute = (route: string) => {
    setRoutes((prev) => (prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]));
  };

  const valid = name.trim().length > 0 && unit.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    const payload = { name: name.trim(), unit: unit.trim(), routes, dailyTotalOnly };
    if (substance) {
      await updateSubstance(db, substance.id, payload);
    } else {
      await createSubstance(db, payload);
    }
    onSaved();
    onClose();
  };

  const toggleArchive = async () => {
    if (!substance) return;
    await setSubstanceArchived(db, substance.id, !substance.archived);
    onSaved();
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={substance ? 'Edit substance' : 'New substance'}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Caffeine" />
      <TextField label="Unit" value={unit} onChangeText={setUnit} placeholder="mg" autoCapitalize="none" />

      <ThemedText type="small" themeColor="textSecondary">
        Routes (pick all that apply — asked when logging only if more than one)
      </ThemedText>
      <View style={styles.chips}>
        {ADMINISTRATION_ROUTES.map((route) => (
          <Chip key={route} label={route} selected={routes.includes(route)} onPress={() => toggleRoute(route)} />
        ))}
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <ThemedText>Daily total only</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Track one amount per day, no timestamps
          </ThemedText>
        </View>
        <Switch value={dailyTotalOnly} onValueChange={setDailyTotalOnly} trackColor={{ true: theme.accent }} />
      </View>

      <Button label={substance ? 'Save changes' : 'Create substance'} onPress={save} disabled={!valid} />
      {substance ? (
        <Button label={substance.archived ? 'Unarchive' : 'Archive'} variant="secondary" onPress={toggleArchive} />
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchLabel: {
    flex: 1,
    gap: 2,
  },
});
