import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { createItem, setItemArchived, updateItem } from '@/db/items';
import { ADMINISTRATION_ROUTES, type Item } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

/** Create or edit a item: name, unit, routes, daily-total-only. */
export function ItemEditorSheet({
  visible,
  ...props
}: {
  visible: boolean;
  /** null → creating a new item */
  item: Item | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mount fresh on each open so state initializes from the item being edited.
  if (!visible) return null;
  return <ItemEditorSheetContent {...props} />;
}

function ItemEditorSheetContent({
  item,
  onClose,
  onSaved,
}: {
  item: Item | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [name, setName] = useState(item?.name ?? '');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [routes, setRoutes] = useState<string[]>(item?.routes ?? []);
  const [dailyTotalOnly, setDailyTotalOnly] = useState(item?.dailyTotalOnly ?? false);
  const [defaultAmountText, setDefaultAmountText] = useState(
    item?.defaultAmount !== null && item?.defaultAmount !== undefined ? String(item.defaultAmount) : '',
  );
  const [trackTimeSince, setTrackTimeSince] = useState(item?.trackTimeSince ?? false);

  const toggleRoute = (route: string) => {
    setRoutes((prev) => (prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]));
  };

  const parsedDefault = parseFloat(defaultAmountText.replace(',', '.'));
  const defaultAmount = defaultAmountText.trim() === '' || isNaN(parsedDefault) ? null : parsedDefault;
  const valid = name.trim().length > 0 && unit.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    const payload = {
      name: name.trim(),
      unit: unit.trim(),
      routes,
      dailyTotalOnly,
      defaultAmount,
      // A daily-total item has no timestamps, so time-since can't apply.
      trackTimeSince: dailyTotalOnly ? false : trackTimeSince,
    };
    if (item) {
      await updateItem(db, item.id, payload);
    } else {
      await createItem(db, payload);
    }
    onSaved();
    onClose();
  };

  const toggleArchive = async () => {
    if (!item) return;
    await setItemArchived(db, item.id, !item.archived);
    onSaved();
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={item ? 'Edit item' : 'New item'}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Caffeine" />
      <TextField label="Unit" value={unit} onChangeText={setUnit} placeholder="mg" autoCapitalize="none" />
      <TextField
        label="Usual amount (optional)"
        value={defaultAmountText}
        onChangeText={setDefaultAmountText}
        keyboardType="decimal-pad"
        placeholder="e.g. 10"
      />
      <ThemedText type="small" themeColor="textSecondary">
        Pre-filled when logging; you can still change it per entry.
      </ThemedText>

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

      {/* Time since needs timestamps, which daily-total items don't have. */}
      {!dailyTotalOnly ? (
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <ThemedText>Track time since last</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Live countup on Today, shown for 6h after each intake
            </ThemedText>
          </View>
          <Switch
            value={trackTimeSince}
            onValueChange={setTrackTimeSince}
            trackColor={{ true: theme.accent }}
          />
        </View>
      ) : null}

      <Button label={item ? 'Save changes' : 'Create item'} onPress={save} disabled={!valid} />
      {item ? (
        <Button label={item.archived ? 'Unarchive' : 'Archive'} variant="secondary" onPress={toggleArchive} />
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
