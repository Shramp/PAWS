import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { endOfTrackingDay, todayKey } from '@/lib/dates';

/**
 * The current tracking-day key, kept fresh: it rolls over on its own at 6am
 * and re-checks whenever the app returns to the foreground (so a phone that
 * sat backgrounded overnight shows the right day immediately).
 */
export function useTodayKey(): string {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      clearTimeout(timer);
      const current = todayKey();
      setKey(current);
      // +1s of slack so the timer never fires a hair before the boundary.
      const msUntilRollover = endOfTrackingDay(current).getTime() - Date.now() + 1000;
      timer = setTimeout(schedule, Math.max(msUntilRollover, 1000));
    };

    schedule();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return key;
}
