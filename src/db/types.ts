/** Something you take: a medication, supplement, drink — anything with a unit. */
export interface Item {
  id: number;
  name: string;
  unit: string;
  routes: string[];
  /** true → one amount per day, timestamps irrelevant */
  dailyTotalOnly: boolean;
  archived: boolean;
  sortOrder: number;
  /** pre-filled when logging if set; always editable per entry */
  defaultAmount: number | null;
}

/** Fields an item editor writes. */
export type ItemInput = Omit<Item, 'id' | 'archived' | 'sortOrder'>;

export interface IntakeEvent {
  id: number;
  itemId: number;
  forDate: string;
  /** null for daily-total-only items */
  timestampMs: number | null;
  amount: number;
  route: string | null;
}

export interface IntakeEventWithItem extends IntakeEvent {
  itemName: string;
  unit: string;
}

export interface ItemTotal {
  itemId: number;
  itemName: string;
  unit: string;
  total: number;
}

export const ADMINISTRATION_ROUTES = ['nasal', 'oral', 'rectal', 'vape', 'pouch', 'patch'];
