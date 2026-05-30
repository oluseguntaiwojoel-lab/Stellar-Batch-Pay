import type { DateRangeValue } from "@/components/dashboard/HistoryFilterBar";

const DATE_RANGE_DAYS: Record<DateRangeValue, number> = {
  "7days": 7,
  "30days": 30,
  "90days": 90,
  year: 365,
};

/** Convert a preset date-range filter into an ISO `from` timestamp for createdAt. */
export function dateRangeToFrom(dateRange: DateRangeValue): string {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - DATE_RANGE_DAYS[dateRange]);
  return from.toISOString();
}

/** Escape `%` and `_` so user input is treated literally in SQL LIKE patterns. */
export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
