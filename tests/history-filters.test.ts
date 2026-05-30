import { describe, expect, test } from "vitest";
import { dateRangeToFrom } from "../lib/history-filters";

describe("dateRangeToFrom", () => {
  test("returns an ISO timestamp in the past", () => {
    const now = Date.now();
    const from = dateRangeToFrom("7days");
    const parsed = Date.parse(from);
    expect(parsed).toBeLessThan(now);
    expect(now - parsed).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
  });
});
