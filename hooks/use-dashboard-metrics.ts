"use client";

import { useState, useEffect } from "react";

export interface DashboardMetrics {
  totalPayments: number;
  totalAmountSent: string;
  successRate: string;
  activeBatches: number;
  totalPaymentsTrend?: string;
  totalAmountSentTrend?: string;
  successRateTrend?: string;
  activeBatchesTrend?: string;
}

export function useDashboardMetrics(publicKey: string | null, network: "testnet" | "mainnet") {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setMetrics(null);
      return;
    }

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/dashboard-metrics?publicKey=${encodeURIComponent(publicKey)}&network=${network}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }

        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        // Set default metrics when there's an error
        setMetrics({
          totalPayments: 0,
          totalAmountSent: "0 XLM",
          successRate: "0.0%",
          activeBatches: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [publicKey, network]);

  return { metrics, loading, error };
}
