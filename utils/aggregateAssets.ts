/**
 * Aggregate asset amounts across payments or balances.
 */

import { PaymentInstruction } from '@/lib/stellar/types';

/** Minimal shape of a Horizon balance object (native or issued asset). */
type HorizonBalance =
  | { asset_type: 'native'; balance: string; asset_code?: never; asset_issuer?: never }
  | { asset_type: 'credit_alphanum4' | 'credit_alphanum12'; balance: string; asset_code: string; asset_issuer: string };

export interface AssetAmount {
  asset: string; // 'XLM' or 'CODE:ISSUER'
  total: string; // total amount as string (to preserve precision)
  count: number; // number of payments/sources
}

/**
 * Aggregate payments by asset, summing amounts.
 * Returns an array of AssetAmount sorted by asset code.
 */
export function aggregatePaymentsByAsset(payments: PaymentInstruction[]): AssetAmount[] {
  const map = new Map<string, { total: bigint; count: number; decimals: number }>();

  for (const payment of payments) {
    const asset = payment.asset;
    // Amount is a decimal string, convert to bigint with fixed 7 decimal places (Stellar's precision)
    const amountStr = payment.amount;
    const parts = amountStr.split('.');
    let integerPart = parts[0];
    let fractionalPart = parts[1] || '';
    if (fractionalPart.length > 7) {
      fractionalPart = fractionalPart.slice(0, 7); // truncate to 7 decimal places
    }
    const padded = fractionalPart.padEnd(7, '0');
    const totalStroops = BigInt(integerPart) * 10_000_000n + BigInt(padded);

    const existing = map.get(asset);
    if (existing) {
      existing.total += totalStroops;
      existing.count += 1;
    } else {
      map.set(asset, { total: totalStroops, count: 1, decimals: 7 });
    }
  }

  // Convert back to string with decimal point
  const result: AssetAmount[] = [];
  for (const [asset, data] of map.entries()) {
    const divisor = 10n ** BigInt(data.decimals);
    const integer = data.total / divisor;
    const fraction = data.total % divisor;
    const fractionStr = fraction.toString().padStart(data.decimals, '0').replace(/0+$/, '');
    const total = fractionStr.length > 0 ? `${integer.toString()}.${fractionStr}` : integer.toString();
    result.push({ asset, total, count: data.count });
  }

  // Sort by asset code (XLM first)
  result.sort((a, b) => {
    if (a.asset === 'XLM') return -1;
    if (b.asset === 'XLM') return 1;
    return a.asset.localeCompare(b.asset);
  });

  return result;
}

/**
 * Aggregate balances from Horizon balance objects.
 */
export function aggregateBalances(balances: HorizonBalance[]): AssetAmount[] {
  const map = new Map<string, { total: bigint; decimals: number }>();

  for (const balance of balances) {
    if (balance.asset_type === 'native') {
      const asset = 'XLM';
      const amountStr = balance.balance;
      const parts = amountStr.split('.');
      let integerPart = parts[0];
      let fractionalPart = parts[1] || '';
      if (fractionalPart.length > 7) {
        fractionalPart = fractionalPart.slice(0, 7);
      }
      const padded = fractionalPart.padEnd(7, '0');
      const totalStroops = BigInt(integerPart) * 10_000_000n + BigInt(padded);

      const existing = map.get(asset);
      if (existing) {
        existing.total += totalStroops;
      } else {
        map.set(asset, { total: totalStroops, decimals: 7 });
      }
    } else {
      const asset = `${balance.asset_code}:${balance.asset_issuer}`;
      const amountStr = balance.balance;
      const parts = amountStr.split('.');
      let integerPart = parts[0];
      let fractionalPart = parts[1] || '';
      // Issued assets may have up to 7 decimal places as well
      if (fractionalPart.length > 7) {
        fractionalPart = fractionalPart.slice(0, 7);
      }
      const padded = fractionalPart.padEnd(7, '0');
      const totalStroops = BigInt(integerPart) * 10_000_000n + BigInt(padded);

      const existing = map.get(asset);
      if (existing) {
        existing.total += totalStroops;
      } else {
        map.set(asset, { total: totalStroops, decimals: 7 });
      }
    }
  }

  const result: AssetAmount[] = [];
  for (const [asset, data] of map.entries()) {
    const divisor = 10n ** BigInt(data.decimals);
    const integer = data.total / divisor;
    const fraction = data.total % divisor;
    const fractionStr = fraction.toString().padStart(data.decimals, '0').replace(/0+$/, '');
    const total = fractionStr.length > 0 ? `${integer.toString()}.${fractionStr}` : integer.toString();
    result.push({ asset, total, count: 1 });
  }

  result.sort((a, b) => {
    if (a.asset === 'XLM') return -1;
    if (b.asset === 'XLM') return 1;
    return a.asset.localeCompare(b.asset);
  });

  return result;
}
