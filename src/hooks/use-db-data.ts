import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Load data from SQLite, re-running whenever the screen regains focus (so
 * edits made on other tabs show up) or `deps` change. `reload()` refreshes
 * after a local mutation.
 *
 * `loader` is captured fresh on every render and keyed by `deps`, so the fetch
 * always sees current values. (An earlier version stashed it in a ref assigned
 * from an effect, which `useFocusEffect` could outrun on first focus — the
 * fetch then ran a stale closure and the screen rendered empty with no retry.)
 */
export function useDbData<T>(
  loader: (db: SQLiteDatabase) => Promise<T>,
  deps: (string | number | boolean | null)[] = [],
): { data: T | null; reload: () => void; db: SQLiteDatabase } {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | null>(null);
  const [tick, setTick] = useState(0);

  const depsKey = JSON.stringify(deps);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loader(db).then((result) => {
        if (!cancelled) setData(result);
      });
      return () => {
        cancelled = true;
      };
      // depsKey/tick are refetch triggers; `loader` is an inline closure whose
      // identity changes every render, so it is keyed by depsKey instead.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, depsKey, tick]),
  );

  return { data, reload, db };
}
