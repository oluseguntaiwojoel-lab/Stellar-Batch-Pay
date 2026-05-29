/**
 * API route for fetching dashboard metrics for a connected wallet.
 *
 * GET /api/dashboard-metrics?publicKey=<publicKey>&network=<testnet|mainnet>
 *
 * Queries Horizon for the account's operations and aggregates metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { Horizon } from "stellar-sdk";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const publicKey = searchParams.get("publicKey");
  const network = searchParams.get("network");

  if (!publicKey || typeof publicKey !== "string") {
    return NextResponse.json(
      { error: "Missing required query parameter: publicKey" },
      { status: 400 },
    );
  }

  if (network !== "testnet" && network !== "mainnet") {
    return NextResponse.json(
      { error: "network must be 'testnet' or 'mainnet'" },
      { status: 400 },
    );
  }

  const serverUrl =
    network === "testnet"
      ? "https://horizon-testnet.stellar.org"
      : "https://horizon.stellar.org";
  const server = new Horizon.Server(serverUrl);

  try {
    // Get account operations (limit to recent 200 for performance)
    const operations = await server
      .operations()
      .forAccount(publicKey)
      .limit(200)
      .order("desc")
      .call();

    let totalPayments = 0;
    let totalAmountSent = 0; // in stroops for XLM
    let assetCounts: { [key: string]: number } = {};
    let successfulPayments = 0;
    let currentWindowPayments = 0;
    let previousWindowPayments = 0;
    let currentWindowAmount = 0;
    let previousWindowAmount = 0;
    let currentWindowSuccessful = 0;
    let previousWindowSuccessful = 0;

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const currentWindowStart = now - 7 * 24 * 60 * 60 * 1000;
    const previousWindowStart = now - 14 * 24 * 60 * 60 * 1000;

    // Process operations
    for (const op of operations.records) {
      if (op.type === "payment" && op.source_account === publicKey) {
        const opTime = new Date(op.created_at).getTime();
        const nativeAmount = op.asset_type === "native" ? parseFloat(op.amount) : 0;

        totalPayments += 1;
        successfulPayments += 1; // All operations in the response are successful

        if (opTime >= currentWindowStart) {
          currentWindowPayments += 1;
          currentWindowAmount += nativeAmount;
          currentWindowSuccessful += 1;
        } else if (opTime >= previousWindowStart && opTime < currentWindowStart) {
          previousWindowPayments += 1;
          previousWindowAmount += nativeAmount;
          previousWindowSuccessful += 1;
        }

        // Handle amount based on asset type
        if (op.asset_type === "native") {
          // XLM amount in stroops
          totalAmountSent += parseFloat(op.amount) * 10000000; // Convert to stroops
          assetCounts["XLM"] = (assetCounts["XLM"] || 0) + parseFloat(op.amount);
        } else {
          // Issued asset
          const assetKey = `${op.asset_code}:${op.asset_issuer}`;
          assetCounts[assetKey] = (assetCounts[assetKey] || 0) + parseFloat(op.amount);
          // For total amount, we could convert to USD, but for now just count
        }
      }
    }

    // Calculate success rate
    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    // Active batches: rough estimate based on recent activity
    // Group payments by time windows (e.g., last 24 hours)
    let recentPayments = 0;

    for (const op of operations.records) {
      if (op.type === "payment" && op.source_account === publicKey) {
        const opTime = new Date(op.created_at).getTime();
        if (opTime > oneDayAgo) {
          recentPayments += 1;
        }
      }
    }

    // Estimate active batches from recent activity without inventing activity for empty accounts.
    const activeBatches = recentPayments > 0 ? Math.max(1, Math.floor(recentPayments / 10)) : 0;

    // Format total amount (prioritize XLM, otherwise show asset breakdown)
    let totalAmountDisplay = "";
    if (assetCounts["XLM"]) {
      totalAmountDisplay = `${assetCounts["XLM"].toFixed(2)} XLM`;
    } else {
      // Show first asset
      const firstAsset = Object.keys(assetCounts)[0];
      if (firstAsset) {
        totalAmountDisplay = `${assetCounts[firstAsset].toFixed(2)} ${firstAsset}`;
      } else {
        totalAmountDisplay = "0 XLM";
      }
    }

    return NextResponse.json({
      totalPayments,
      totalAmountSent: totalAmountDisplay,
      successRate: successRate.toFixed(1) + "%",
      activeBatches,
      totalPaymentsTrend: formatTrend(currentWindowPayments, previousWindowPayments),
      totalAmountSentTrend: formatTrend(currentWindowAmount, previousWindowAmount),
      successRateTrend: formatTrend(
        rate(currentWindowSuccessful, currentWindowPayments),
        rate(previousWindowSuccessful, previousWindowPayments),
        "pp",
      ),
      activeBatchesTrend: recentPayments > 0 ? "Last 24h" : "No active batches",
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics from Horizon" },
      { status: 500 },
    );
  }
}

function rate(successful: number, total: number): number {
  return total > 0 ? (successful / total) * 100 : 0;
}

function formatTrend(current: number, previous: number, unit: "%" | "pp" = "%"): string {
  if (current === 0 && previous === 0) return "No trend";
  if (previous === 0) return unit === "pp" ? `+${current.toFixed(1)} pp` : "New activity";

  const delta = unit === "pp" ? current - previous : ((current - previous) / previous) * 100;
  const sign = delta > 0 ? "+" : "";
  return unit === "pp" ? `${sign}${delta.toFixed(1)} pp` : `${sign}${delta.toFixed(1)}%`;
}
