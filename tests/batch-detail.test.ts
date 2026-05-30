import { describe, expect, test } from "vitest";
import { mapBatchStatusToDetailView } from "../lib/dashboard/batch-detail";

describe("mapBatchStatusToDetailView", () => {
  test("maps batch-status API payload into dashboard detail recipients", () => {
    const view = mapBatchStatusToDetailView({
      jobId: "job-123",
      status: "completed",
      network: "testnet",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:05:00.000Z",
      totalBatches: 2,
      completedBatches: 2,
      result: {
        batchId: "job-123",
        totalRecipients: 1,
        totalAmount: "10",
        totalTransactions: 1,
        network: "testnet",
        timestamp: "2026-05-01T00:05:00.000Z",
        results: [
          {
            recipient: "GAAA",
            amount: "10",
            asset: "XLM",
            status: "success",
            transactionHash: "abc123",
          },
        ],
        summary: { successful: 1, failed: 0 },
      },
    });

    expect(view.recipients).toEqual([
      {
        address: "GAAA",
        amount: "10",
        asset: "XLM",
        status: "success",
        transactionHash: "abc123",
        error: undefined,
      },
    ]);
    expect(view.summary).toEqual({ successful: 1, failed: 0 });
    expect(view.completedAt).toBe("2026-05-01T00:05:00.000Z");
  });
});
