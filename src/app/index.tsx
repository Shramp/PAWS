import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { IntakeList } from '@/components/intake-list';
import { LogIntakeSheet } from '@/components/log-intake-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { intakeForDate, isDayConfirmed, listItems, setDayConfirmed } from '@/db/items';
import { type IntakeEventWithItem } from '@/db/types';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { useTodayKey } from '@/hooks/use-today-key';
import { shortDate } from '@/lib/dates';

export default function TodayScreen() {
  const bottomPadding = useTabContentPadding();
  const today = useTodayKey();
  const [sheet, setSheet] = useState<{ open: boolean; editing: IntakeEventWithItem | null }>({
    open: false,
    editing: null,
  });

  const { data, reload, db } = useDbData(
    async (db) => {
      const [items, intake, confirmed] = await Promise.all([
        listItems(db),
        intakeForDate(db, today),
        isDayConfirmed(db, today),
      ]);
      return { items, intake, confirmed };
    },
    [today],
  );

  const dayTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of data?.intake ?? []) {
      map.set(e.itemId, (map.get(e.itemId) ?? 0) + e.amount);
    }
    return map;
  }, [data]);

  const closeSheet = () => setSheet({ open: false, editing: null });

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          Today
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {shortDate(today)}
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        <IntakeList
          events={data?.intake ?? []}
          emptyLabel={data?.confirmed ? 'Nothing taken — confirmed. 🐾' : 'Nothing logged today.'}
          onPressEvent={(event) => setSheet({ open: true, editing: event })}
        />
        <Button label="+ Log intake" onPress={() => setSheet({ open: true, editing: null })} />
        {data && data.intake.length === 0 ? (
          <Button
            label={data.confirmed ? 'Undo nothing-taken' : 'Mark nothing taken'}
            variant="secondary"
            onPress={async () => {
              await setDayConfirmed(db, today, !data.confirmed);
              reload();
            }}
          />
        ) : null}
      </ScrollView>

      <LogIntakeSheet
        visible={sheet.open && (data?.items.length ?? 0) > 0}
        items={data?.items ?? []}
        forDate={today}
        currentTotals={dayTotals}
        editing={sheet.editing}
        onClose={closeSheet}
        onSaved={reload}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
