"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Horizon } from "stellar-sdk";
import { horizonService } from "@/services/horizon";

export type AssetBalance = {
  assetCode: string;
  assetIssuer?: string;
  balance: string;
};

export function useBalances() {
  const { publicKey, isConnecting, network } = useWallet();
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!publicKey || !network) {
      setBalances([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const horizonNetwork = network === 'testnet' || network === 'mainnet' ? network : 'testnet';
      const server = horizonService.getServer(horizonNetwork);
      const account = await server.loadAccount(publicKey);
      const assetBalances: AssetBalance[] = account.balances
        .filter((balance) => balance.balance && parseFloat(balance.balance) > 0 && balance.asset_type !== "liquidity_pool_shares")
        .map((balance: any) => ({
          assetCode: balance.asset_type === "native" ? "XLM" : balance.asset_code,
          assetIssuer:
            balance.asset_type === "native" ? undefined : balance.asset_issuer,
          balance: balance.balance,
        }));

      setBalances(assetBalances);
    } catch (err) {
      console.error("Failed to fetch balances:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch asset balances"
      );
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey, network]);

  useEffect(() => {
    if (publicKey && !isConnecting && network) {
      fetchBalances();
    }
  }, [publicKey, isConnecting, network, fetchBalances]);

  // Refetch when wallet reconnects (publicKey changes) or manually
  const refetch = useCallback(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, error, refetch };
}