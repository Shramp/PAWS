/**
 * All dates in the app are "date keys": local-timezone YYYY-MM-DD strings.
 * Entries are keyed by the local day they apply to, independent of when they
 * were entered (backdating is a first-class feature).
 */

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Parse a date key into a Date at local midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Monday of the week containing `key`. */
export function startOfWeekKey(key: string): string {
  const d = parseDateKey(key);
  const dow = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - dow);
  return dateKey(d);
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export { MONTH_LABELS, WEEKDAY_LABELS };

export function friendlyDate(key: string): string {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  const d = parseDateKey(key);
  const wd = WEEKDAY_LABELS[(d.getDay() + 6) % 7];
  return `${wd}, ${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function shortDate(key: string): string {
  const d = parseDateKey(key);
  return `${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function weekRangeLabel(weekStartKey: string): string {
  return `${shortDate(weekStartKey)} – ${shortDate(addDays(weekStartKey, 6))}`;
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${ampm}`;
}

/**
 * Month grid for a calendar view: array of weeks (Monday-first), each week an
 * array of 7 date keys or null for cells outside the month.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7;

  const cells: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(dateKey(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function monthTitle(year: number, month: number): string {
  return `${MONTH_LABELS[month]} ${year}`;
}
