/**
 * Regression tests for the background batch worker.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { Keypair } from "stellar-sdk";

process.env.JOB_STORE_PATH = ":memory:";

const mockSubmitTransaction = vi.fn();

vi.mock("stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stellar-sdk")>();

  class MockServer {
    submitTransaction = mockSubmitTransaction;
  }

  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: MockServer,
    },
    TransactionBuilder: {
      fromXDR: vi.fn(() => ({
        sign: vi.fn(),
      })),
    },
  };
});

describe("processJobInBackground", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSubmitTransaction.mockReset();
    mockSubmitTransaction.mockRejectedValue(new Error("horizon down"));
  });

  test("marks a pre-signed job failed when every Horizon submit fails", async () => {
    const { createJob, getJob } = await import("../lib/job-store");
    const { processJobInBackground } = await import("../lib/stellar/batch-worker");

    const owner = Keypair.random().publicKey();
    const recipient = Keypair.random().publicKey();
    const signedTransactions = ["AAAA"];
    const payments = [{ address: recipient, amount: "1", asset: "XLM" }];

    const jobId = createJob(payments, "testnet", owner, signedTransactions);

    await processJobInBackground(jobId, payments, "testnet");

    const job = getJob(jobId);

    expect(job?.status).toBe("failed");
    expect(job?.result?.summary.failed).toBe(1);
    expect(job?.result?.summary.successful).toBe(0);
  });
});