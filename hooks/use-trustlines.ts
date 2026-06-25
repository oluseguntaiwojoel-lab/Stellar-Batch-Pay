"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Horizon } from "stellar-sdk";
import { horizonService } from "@/services/horizon";
import pLimit from "p-limit";

export type TrustlineCheckResult = {
  address: string;
  hasTrustline: boolean;
};

// Cache for trustline checks: key = "address:assetCode:assetIssuer"
const trustlineCache = new Map<string, TrustlineCheckResult>();

function getCacheKey(
  address: string,
  assetCode: string,
  assetIssuer?: string,
): string {
  return `${address}:${assetCode}:${assetIssuer || "native"}`;
}

function getAddressesHash(addresses: string[]): string {
  // Create a hash of sorted addresses for memoization
  return addresses.slice().sort().join("|");
}

export function useTrustlines(assetCode: string, assetIssuer?: string) {
  const { publicKey, network } = useWallet();
  const [results, setResults] = useState<TrustlineCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTrustlines = useCallback(
    async (addresses: string[]) => {
      if (!publicKey || !network || addresses.length === 0) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const horizonNetwork =
          network === "testnet" || network === "mainnet" ? network : "testnet";
        const server = horizonService.getServer(horizonNetwork);

        // Parallelize with concurrency limit of 10
        const limit = pLimit(10);
        const trustlineResults: TrustlineCheckResult[] = [];

        const checkPromises = addresses.map((address) =>
          limit(async () => {
            const cacheKey = getCacheKey(address, assetCode, assetIssuer);

            // Check cache first
            if (trustlineCache.has(cacheKey)) {
              return trustlineCache.get(cacheKey)!;
            }

            try {
              const account = await server.loadAccount(address);
              const hasTrustline = account.balances.some(
                (balance: any) =>
                  balance.asset_type !== "native" &&
                  balance.asset_type !== "liquidity_pool_shares" &&
                  balance.asset_code === assetCode &&
                  balance.asset_issuer === assetIssuer,
              );
              const result: TrustlineCheckResult = { address, hasTrustline };
              trustlineCache.set(cacheKey, result);
              return result;
            } catch (err) {
              // If we can't load the account, assume no trustline
              console.warn(`Failed to load account ${address}:`, err);
              const result: TrustlineCheckResult = {
                address,
                hasTrustline: false,
              };
              trustlineCache.set(cacheKey, result);
              return result;
            }
          }),
        );

        const results = await Promise.all(checkPromises);
        setResults(results);
      } catch (err) {
        console.error("Failed to check trustlines:", err);
        setError(
          err instanceof Error ? err.message : "Failed to check trustlines",
        );
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [publicKey, network, assetCode, assetIssuer],
  );

  // Refetch when wallet reconnects (publicKey changes) or when asset changes
  const refetch = useCallback(
    (addresses: string[]) => {
      checkTrustlines(addresses);
    },
    [checkTrustlines],
  );

  return { results, loading, error, refetch };
}
