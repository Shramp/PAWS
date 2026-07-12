import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data from SQLite, re-running whenever the screen regains focus (so
 * edits made on other tabs show up) or `deps` change. `reload()` refreshes
 * after a local mutation.
 */
export function useDbData<T>(
  loader: (db: SQLiteDatabase) => Promise<T>,
  deps: (string | number | boolean | null)[] = [],
): { data: T | null; reload: () => void; db: SQLiteDatabase } {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | null>(null);
  const [tick, setTick] = useState(0);

  // Keep the latest loader without making it a dependency (callers pass
  // inline closures; depending on identity would refetch every render).
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const depsKey = JSON.stringify(deps);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loaderRef.current(db).then((result) => {
        if (!cancelled) setData(result);
      });
      return () => {
        cancelled = true;
      };
      // depsKey/tick are intentional refetch triggers, not values used inside.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, depsKey, tick]),
  );

  return { data, reload, db };
}
