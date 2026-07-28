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

export const ADMINISTRATION_ROUTES = ['nasal', 'oral', 'rectal', 'vape', 'pouch', 'patch'];
