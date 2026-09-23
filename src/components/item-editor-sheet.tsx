import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

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
  /** Routes any item already uses, so custom ones can be reused. */
  knownRoutes: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mount fresh on each open so state initializes from the item being edited.
  if (!visible) return null;
  return <ItemEditorSheetContent {...props} />;
}

function ItemEditorSheetContent({
  item,
  knownRoutes,
  onClose,
  onSaved,
}: {
  item: Item | null;
  knownRoutes: string[];
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
  const [customRoute, setCustomRoute] = useState('');
  // Routes added in this session but not yet saved, so they stay visible after deselecting.
  const [addedRoutes, setAddedRoutes] = useState<string[]>([]);

  const routeChoices = Array.from(
    new Set([...ADMINISTRATION_ROUTES, ...knownRoutes, ...(item?.routes ?? []), ...addedRoutes]),
  );

  const toggleRoute = (route: string) => {
    setRoutes((prev) => (prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]));
  };

  const addCustomRoute = () => {
    const route = customRoute.trim().toLowerCase();
    if (!route) return;
    setAddedRoutes((prev) => (prev.includes(route) ? prev : [...prev, route]));
    setRoutes((prev) => (prev.includes(route) ? prev : [...prev, route]));
    setCustomRoute('');
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

  const footer = (
    <>
      <Button label={item ? 'Save changes' : 'Create item'} onPress={save} disabled={!valid} />
      {item ? (
        <Button label={item.archived ? 'Unarchive' : 'Archive'} variant="secondary" onPress={toggleArchive} />
      ) : null}
    </>
  );

  return (
    <Sheet visible onClose={onClose} title={item ? 'Edit item' : 'New item'} footer={footer} scrollable>
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
        {routeChoices.map((route) => (
          <Chip key={route} label={route} selected={routes.includes(route)} onPress={() => toggleRoute(route)} />
        ))}
      </View>
      <View style={styles.addRouteRow}>
        <TextInput
          value={customRoute}
          onChangeText={setCustomRoute}
          onSubmitEditing={addCustomRoute}
          placeholder="Add your own route…"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={[styles.addRouteInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        <Button label="Add" variant="secondary" onPress={addCustomRoute} disabled={!customRoute.trim()} />
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
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  addRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addRouteInput: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 16,
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
