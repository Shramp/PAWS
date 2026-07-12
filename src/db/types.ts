/** Shapes a tracker can take. Adding a new tracker is config, not code. */
export type TrackerShape = 'bool' | 'scale' | 'multi_pick' | 'measure';

export interface TrackerConfig {
  /** scale + multi_pick: ordered options (scale is worst → best) */
  options?: string[];
  /** multi_pick: whether the user can add new options while logging */
  allowCustom?: boolean;
  /** measure: label for the numeric value, e.g. "Hours slept" */
  valueLabel?: string;
  /** measure: unit suffix for the numeric value, e.g. "h" */
  valueUnit?: string;
  /** measure: ordered rating options, worst → best */
  ratingOptions?: string[];
}

export interface Tracker {
  id: number;
  name: string;
  shape: TrackerShape;
  config: TrackerConfig;
  sortOrder: number;
  archived: boolean;
}

/**
 * One logged value for a daily tracker.
 * value encoding by shape:
 *   bool       → "1"
 *   scale      → the option string
 *   multi_pick → one row per picked option, value = option string
 *   measure    → JSON {"v": number, "r": rating string}
 */
export interface DailyEntry {
  id: number;
  trackerId: number;
  forDate: string;
  value: string;
}

export interface MeasureValue {
  v: number;
  r: string;
}

export interface Substance {
  id: number;
  name: string;
  unit: string;
  routes: string[];
  /** true → one amount per day, timestamps irrelevant */
  dailyTotalOnly: boolean;
  archived: boolean;
  sortOrder: number;
}

export interface UsageEvent {
  id: number;
  substanceId: number;
  forDate: string;
  /** null for daily-total-only substances */
  timestampMs: number | null;
  amount: number;
  route: string | null;
}

export interface UsageEventWithSubstance extends UsageEvent {
  substanceName: string;
  unit: string;
}

export interface SubstanceTotal {
  substanceId: number;
  substanceName: string;
  unit: string;
  total: number;
}

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  createdAtMs: number;
  completedAtMs: number | null;
  completionNote: string | null;
}

export const ADMINISTRATION_ROUTES = ['nasal', 'oral', 'rectal', 'vape', 'pouch', 'patch'];
