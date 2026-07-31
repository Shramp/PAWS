import DateTimePicker from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { addIntake, setDailyTotal } from '@/db/items';
import { type Item } from '@/db/types';
import { parseDateKey, todayKey } from '@/lib/dates';

/** Initial picker time: "now" when logging today, midday when backfilling. */
function defaultTime(forDate: string): Date {
  if (forDate === todayKey()) return new Date();
  const d = parseDateKey(forDate);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Log a item usage event (or set the day's total for daily-total-only items). */
export function LogIntakeSheet({
  visible,
  ...props
}: {
  visible: boolean;
  items: Item[];
  forDate: string;
  /** current day totals keyed by item id, used to prefill daily-total-only items */
  currentTotals: Map<number, number>;
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
  onClose,
  onSaved,
}: {
  items: Item[];
  forDate: string;
  currentTotals: Map<number, number>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const [item, setItem] = useState<Item | null>(null);
  const [amountText, setAmountText] = useState('');
  const [route, setRoute] = useState<string | null>(null);
  const [time, setTime] = useState(() => defaultTime(forDate));

  const pickItem = (s: Item) => {
    setItem(s);
    setRoute(s.routes.length === 1 ? s.routes[0] : null);
    setAmountText(s.dailyTotalOnly ? String(currentTotals.get(s.id) ?? '') : '');
  };

  const amount = parseFloat(amountText.replace(',', '.'));
  const needsRoute = (item?.routes.length ?? 0) > 1 && !item?.dailyTotalOnly;
  const needsTime = item !== null && !item.dailyTotalOnly;
  const valid =
    item !== null && !isNaN(amount) && amount >= 0 && (!needsRoute || route !== null);

  const save = async () => {
    if (!item || !valid) return;
    if (item.dailyTotalOnly) {
      await setDailyTotal(db, item.id, forDate, amount);
    } else {
      const d = parseDateKey(forDate);
      d.setHours(time.getHours(), time.getMinutes(), 0, 0);
      await addIntake(db, {
        itemId: item.id,
        forDate,
        timestampMs: d.getTime(),
        amount,
        route,
      });
    }
    onSaved();
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={item ? item.name : 'Log intake'}>
      {items.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          No items configured yet — add them in Settings.
        </ThemedText>
      ) : !item ? (
        <View style={styles.chips}>
          {items.map((s) => (
            <Chip key={s.id} label={s.name} onPress={() => pickItem(s)} />
          ))}
        </View>
      ) : (
        <>
          <TextField
            label={
              item.dailyTotalOnly
                ? `Total for the day (${item.unit})`
                : `Amount (${item.unit})`
            }
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="0"
            autoFocus
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
          <Button label="Save" onPress={save} disabled={!valid} />
          <Button label="Back" variant="secondary" onPress={() => setItem(null)} />
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
