import DateTimePicker from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { addIntake, deleteIntake, setDailyTotal, updateIntake } from '@/db/items';
import { type IntakeEventWithItem, type Item } from '@/db/types';
import { DAY_START_HOUR, parseDateKey, timestampForDayAndTime, todayKey } from '@/lib/dates';

/** Initial picker time: "now" when logging today, midday when backfilling. */
function defaultTime(forDate: string): Date {
  if (forDate === todayKey()) return new Date();
  const d = parseDateKey(forDate);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * Log a new intake, or edit an existing entry when `editing` is given.
 * Set the day's single total instead for daily-total-only items.
 */
export function LogIntakeSheet({
  visible,
  ...props
}: {
  visible: boolean;
  items: Item[];
  forDate: string;
  /** current day totals keyed by item id, used to prefill daily-total-only items */
  currentTotals: Map<number, number>;
  /** when set, the sheet edits this entry instead of creating a new one */
  editing?: IntakeEventWithItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mount fresh on each open so state starts clean.
  if (!visible) return null;
  return <LogIntakeSheetContent {...props} />;
}

function LogIntakeSheetContent({
  items,
  forDate,
  currentTotals,
  editing = null,
  onClose,
  onSaved,
}: {
  items: Item[];
  forDate: string;
  currentTotals: Map<number, number>;
  editing?: IntakeEventWithItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const editingItem = editing ? (items.find((i) => i.id === editing.itemId) ?? null) : null;

  const [item, setItem] = useState<Item | null>(editingItem);
  const [amountText, setAmountText] = useState(editing ? String(editing.amount) : '');
  const [route, setRoute] = useState<string | null>(editing?.route ?? null);
  const [time, setTime] = useState(() =>
    editing?.timestampMs != null ? new Date(editing.timestampMs) : defaultTime(forDate),
  );

  const pickItem = (chosen: Item) => {
    setItem(chosen);
    setRoute(chosen.routes.length === 1 ? chosen.routes[0] : null);
    setAmountText(
      chosen.dailyTotalOnly
        ? String(currentTotals.get(chosen.id) ?? chosen.defaultAmount ?? '')
        : chosen.defaultAmount !== null
          ? String(chosen.defaultAmount)
          : '',
    );
  };

  const amount = parseFloat(amountText.replace(',', '.'));
  const needsRoute = (item?.routes.length ?? 0) > 1 && !item?.dailyTotalOnly;
  const needsTime = item !== null && !item.dailyTotalOnly;
  const valid = item !== null && !isNaN(amount) && amount >= 0 && (!needsRoute || route !== null);

  const save = async () => {
    if (!item || !valid) return;
    if (item.dailyTotalOnly) {
      await setDailyTotal(db, item.id, forDate, amount);
    } else {
      const timestamp = timestampForDayAndTime(forDate, time.getHours(), time.getMinutes());
      const payload = { forDate, timestampMs: timestamp.getTime(), amount, route };
      if (editing) {
        await updateIntake(db, editing.id, payload);
      } else {
        await addIntake(db, { itemId: item.id, ...payload });
      }
    }
    onSaved();
    onClose();
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert('Delete entry?', `${editing.itemName} — ${editing.amount}${editing.unit}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteIntake(db, editing.id);
          onSaved();
          onClose();
        },
      },
    ]);
  };

  const title = editing ? `Edit ${editing.itemName}` : item ? item.name : 'Log intake';

  return (
    <Sheet visible onClose={onClose} title={title}>
      {items.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Nothing set up yet — add items in Settings.
        </ThemedText>
      ) : !item ? (
        <View style={styles.chips}>
          {items.map((i) => (
            <Chip key={i.id} label={i.name} onPress={() => pickItem(i)} />
          ))}
        </View>
      ) : (
        <>
          <TextField
            label={item.dailyTotalOnly ? `Total for the day (${item.unit})` : `Amount (${item.unit})`}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="0"
            autoFocus={!editing}
            selectTextOnFocus
          />
          {needsRoute ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Route
              </ThemedText>
              <View style={styles.chips}>
                {item.routes.map((r) => (
                  <Chip key={r} label={r} selected={route === r} onPress={() => setRoute(r)} />
                ))}
              </View>
            </>
          ) : null}
          {needsTime ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Time
                {time.getHours() < DAY_START_HOUR ? '  ·  after midnight, counts for this day' : ''}
              </ThemedText>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                themeVariant="dark"
                style={styles.timePicker}
                onChange={(_, selected) => {
                  if (selected) setTime(selected);
                }}
              />
            </>
          ) : null}
          <Button label={editing ? 'Save changes' : 'Save'} onPress={save} disabled={!valid} />
          {editing ? (
            <Button label="Delete entry" variant="danger" onPress={confirmDelete} />
          ) : (
            <Button label="Back" variant="secondary" onPress={() => setItem(null)} />
          )}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  timePicker: {
    alignSelf: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
