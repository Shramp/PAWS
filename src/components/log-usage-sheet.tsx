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
import { addUsage, setDailyTotal } from '@/db/substances';
import { type Substance } from '@/db/types';
import { parseDateKey, todayKey } from '@/lib/dates';

/** Initial picker time: "now" when logging today, midday when backfilling. */
function defaultTime(forDate: string): Date {
  if (forDate === todayKey()) return new Date();
  const d = parseDateKey(forDate);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Log a substance usage event (or set the day's total for daily-total-only substances). */
export function LogUsageSheet({
  visible,
  ...props
}: {
  visible: boolean;
  substances: Substance[];
  forDate: string;
  /** current day totals keyed by substance id, used to prefill daily-total-only substances */
  currentTotals: Map<number, number>;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mount fresh on each open so state starts clean.
  if (!visible) return null;
  return <LogUsageSheetContent {...props} />;
}

function LogUsageSheetContent({
  substances,
  forDate,
  currentTotals,
  onClose,
  onSaved,
}: {
  substances: Substance[];
  forDate: string;
  currentTotals: Map<number, number>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();
  const [substance, setSubstance] = useState<Substance | null>(null);
  const [amountText, setAmountText] = useState('');
  const [route, setRoute] = useState<string | null>(null);
  const [time, setTime] = useState(() => defaultTime(forDate));

  const pickSubstance = (s: Substance) => {
    setSubstance(s);
    setRoute(s.routes.length === 1 ? s.routes[0] : null);
    setAmountText(s.dailyTotalOnly ? String(currentTotals.get(s.id) ?? '') : '');
  };

  const amount = parseFloat(amountText.replace(',', '.'));
  const needsRoute = (substance?.routes.length ?? 0) > 1 && !substance?.dailyTotalOnly;
  const needsTime = substance !== null && !substance.dailyTotalOnly;
  const valid =
    substance !== null && !isNaN(amount) && amount >= 0 && (!needsRoute || route !== null);

  const save = async () => {
    if (!substance || !valid) return;
    if (substance.dailyTotalOnly) {
      await setDailyTotal(db, substance.id, forDate, amount);
    } else {
      const d = parseDateKey(forDate);
      d.setHours(time.getHours(), time.getMinutes(), 0, 0);
      await addUsage(db, {
        substanceId: substance.id,
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
    <Sheet visible onClose={onClose} title={substance ? substance.name : 'Log usage'}>
      {substances.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          No substances configured yet — add them in Settings.
        </ThemedText>
      ) : !substance ? (
        <View style={styles.chips}>
          {substances.map((s) => (
            <Chip key={s.id} label={s.name} onPress={() => pickSubstance(s)} />
          ))}
        </View>
      ) : (
        <>
          <TextField
            label={
              substance.dailyTotalOnly
                ? `Total for the day (${substance.unit})`
                : `Amount (${substance.unit})`
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
                {substance.routes.map((r) => (
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
          <Button label="Back" variant="secondary" onPress={() => setSubstance(null)} />
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
