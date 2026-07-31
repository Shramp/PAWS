import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LogIntakeSheet } from '@/components/log-intake-sheet';
import { ThemedText } from '@/components/themed-text';
import { IntakeList } from '@/components/intake-list';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { isDayConfirmed, listItems, setDayConfirmed, intakeForDate } from '@/db/items';
import { useDbData } from '@/hooks/use-db-data';
import { useTabContentPadding } from '@/hooks/use-tab-content-padding';
import { shortDate, todayKey } from '@/lib/dates';

export default function TodayScreen() {
  const bottomPadding = useTabContentPadding();
  const [intakeOpen, setIntakeOpen] = useState(false);
  const today = todayKey();

  const { data, reload, db } = useDbData(async (db) => {
    const [items, intake, confirmed] = await Promise.all([
      listItems(db),
      intakeForDate(db, today),
      isDayConfirmed(db, today),
    ]);
    return { items, intake, confirmed };
  }, [today]);

  const dayTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const u of data?.intake ?? []) {
      map.set(u.itemId, (map.get(u.itemId) ?? 0) + u.amount);
    }
    return map;
  }, [data]);

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
          emptyLabel={data?.confirmed ? 'Nothing taken — confirmed — clean paws. 🐾' : 'Nothing logged today.'}
          onChanged={reload}
        />
        <Button label="+ Log intake" onPress={() => setIntakeOpen(true)} />
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
        visible={intakeOpen && (data?.items.length ?? 0) > 0}
        items={data?.items ?? []}
        forDate={today}
        currentTotals={dayTotals}
        onClose={() => setIntakeOpen(false)}
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
