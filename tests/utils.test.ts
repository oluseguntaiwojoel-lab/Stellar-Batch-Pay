/**
 * Tests for lib/stellar/utils.ts — parseStellarAmount, formatStellarAmount, sumStellarAmounts
 *
 * These tests prove that big.js arithmetic eliminates the float rounding errors
 * that JavaScript's native number type introduces in financial calculations.
 */

import { describe, test, expect } from "vitest";
import Big from "big.js";
import {
  parseStellarAmount,
  formatStellarAmount,
  sumStellarAmounts,
} from "../lib/stellar/utils";

// ---------------------------------------------------------------------------
// parseStellarAmount — valid inputs
// ---------------------------------------------------------------------------

describe("parseStellarAmount — valid inputs", () => {
  test("parses whole number amount", () => {
    const result = parseStellarAmount("100");
    expect(result.eq(new Big(100))).toBe(true);
  });

  test("parses 7 decimal places exactly", () => {
    const result = parseStellarAmount("0.0000001");
    expect(result.eq(new Big("0.0000001"))).toBe(true);
  });

  test("parses maximum valid amount", () => {
    expect(() => parseStellarAmount("922337203685.4775807")).not.toThrow();
  });

  test("parses zero", () => {
    const result = parseStellarAmount("0");
    expect(result.eq(new Big(0))).toBe(true);
  });

  test("parses decimal amount with fewer than 7 places", () => {
    const result = parseStellarAmount("100.5");
    expect(result.eq(new Big("100.5"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseStellarAmount — invalid inputs
// ---------------------------------------------------------------------------

describe("parseStellarAmount — invalid inputs", () => {
  test("rejects empty string", () => {
    expect(() => parseStellarAmount("")).toThrow();
  });

  test("rejects non-numeric string", () => {
    expect(() => parseStellarAmount("abc")).toThrow();
  });

  test("rejects negative amount", () => {
    expect(() => parseStellarAmount("-1")).toThrow();
  });

  test("rejects scientific notation", () => {
    expect(() => parseStellarAmount("1e7")).toThrow();
  });

  test("rejects more than 7 decimal places", () => {
    // 8 decimal places
    expect(() => parseStellarAmount("0.00000001")).toThrow();
  });

  test("rejects amount exceeding Stellar max", () => {
    // max + 1 stroop
    expect(() => parseStellarAmount("922337203685.4775808")).toThrow();
  });

  test("rejects whitespace-only string", () => {
    expect(() => parseStellarAmount("   ")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// sumStellarAmounts — precision tests (the critical regression tests)
// ---------------------------------------------------------------------------

describe("sumStellarAmounts — precision", () => {
  test("0.1 + 0.2 equals exactly 0.3", () => {
    // This test FAILS with float math — proves the fix works
    const result = sumStellarAmounts(["0.1", "0.2"]);
    expect(result.eq(new Big("0.3"))).toBe(true);
  });

  test("repeating decimal accumulation stays exact", () => {
    // 300 × 0.3333333 = 99.9999900 exactly
    const amounts = Array(300).fill("0.3333333");
    const result = sumStellarAmounts(amounts);
    expect(result.eq(new Big("99.9999900"))).toBe(true);
  });

  test("max precision amounts sum correctly", () => {
    const result = sumStellarAmounts(["0.0000001", "0.0000001"]);
    expect(result.eq(new Big("0.0000002"))).toBe(true);
  });

  test("large batch sum — 1000 payments of 100.1234567", () => {
    const amounts = Array(1000).fill("100.1234567");
    const result = sumStellarAmounts(amounts);
    expect(result.eq(new Big("100123.4567000"))).toBe(true);
  });

  test("empty array returns zero", () => {
    const result = sumStellarAmounts([]);
    expect(result.eq(new Big(0))).toBe(true);
  });

  test("single amount returns that amount", () => {
    const result = sumStellarAmounts(["42.5000000"]);
    expect(result.eq(new Big("42.5"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatStellarAmount
// ---------------------------------------------------------------------------

describe("formatStellarAmount", () => {
  test("formats whole number to 7 decimal places", () => {
    expect(formatStellarAmount(new Big("100"))).toBe("100.0000000");
  });

  test("formats 1 stroop correctly", () => {
    expect(formatStellarAmount(new Big("0.0000001"))).toBe("0.0000001");
  });

  test("formats zero correctly", () => {
    expect(formatStellarAmount(new Big("0"))).toBe("0.0000000");
  });

  test("pads short decimals to 7 places", () => {
    expect(formatStellarAmount(new Big("100.5"))).toBe("100.5000000");
  });
});
