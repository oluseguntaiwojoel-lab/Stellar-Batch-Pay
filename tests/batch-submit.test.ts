/**
 * Regression tests for POST /api/batch-submit idempotency handling.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { Keypair } from "stellar-sdk";

const { mockProcessJobInBackground } = vi.hoisted(() => ({
  mockProcessJobInBackground: vi.fn(),
}));

const { mockCreateIdempotentJob } = vi.hoisted(() => ({
  mockCreateIdempotentJob: vi.fn(),
}));

vi.mock("@/lib/stellar/batch-worker", () => ({
  processJobInBackground: mockProcessJobInBackground,
}));

vi.mock("@/lib/job-store", async () => {
  class MockIdempotencyConflictError extends Error {
    constructor() {
      super("Idempotency key already exists for a different request body");
      this.name = "IdempotencyConflictError";
    }
  }

  const entries = new Map<string, { requestHash: string; jobId: string; responseBody: unknown }>();

  mockCreateIdempotentJob.mockImplementation((args: {
    idempotencyKey: string;
    requestHash: string;
    buildResponseBody: (jobId: string) => unknown;
  }) => {
    const existing = entries.get(args.idempotencyKey);
    if (existing) {
      if (existing.requestHash !== args.requestHash) {
        throw new MockIdempotencyConflictError();
      }

      return {
        jobId: existing.jobId,
        responseBody: existing.responseBody,
        replayed: true,
      };
    }

    const jobId = `job-${entries.size + 1}`;
    const responseBody = args.buildResponseBody(jobId);
    entries.set(args.idempotencyKey, {
      requestHash: args.requestHash,
      jobId,
      responseBody,
    });

    return {
      jobId,
      responseBody,
      replayed: false,
    };
  });

  return {
    createIdempotentJob: mockCreateIdempotentJob,
    IdempotencyConflictError: MockIdempotencyConflictError,
  };
});

vi.mock("@/lib/api-rate-limit", () => ({
  applyRateLimit: vi.fn(() => ({ blocked: false, response: undefined })),
  setRateLimitHeaders: vi.fn((response: Response) => response),
}));

import { POST } from "@/app/api/batch-submit/route";

const OWNER_KEYPAIR = Keypair.random();
const OWNER_PUBLIC_KEY = OWNER_KEYPAIR.publicKey();
const SERVER_KEYPAIR = Keypair.random();
const OTHER_PUBLIC_KEY = Keypair.random().publicKey();

const baseBody = {
  network: "testnet" as const,
  publicKey: OWNER_PUBLIC_KEY,
  signedTransactions: ["AAAA"],
};

beforeEach(() => {
  mockProcessJobInBackground.mockClear();
  mockCreateIdempotentJob.mockClear();
  delete process.env.ALLOW_SERVER_SIGNING;
  delete process.env.STELLAR_SECRET_KEY;
});

function makeRequest(body: object, idempotencyKey: string) {
  return new Request("http://localhost/api/batch-submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/batch-submit idempotency", () => {
  test("returns the same jobId for a replayed request and only starts one worker", async () => {
    const idempotencyKey = "stable-idempotency-key";

    const firstResponse = await POST(makeRequest(baseBody, idempotencyKey) as never);
    const firstJson = await firstResponse.json();

    const secondResponse = await POST(makeRequest(baseBody, idempotencyKey) as never);
    const secondJson = await secondResponse.json();

    expect(firstResponse.status).toBe(202);
    expect(secondResponse.status).toBe(202);
    expect(firstJson.jobId).toBe(secondJson.jobId);
    expect(mockProcessJobInBackground).toHaveBeenCalledTimes(1);
  });

  test("rejects server signing when the configured secret does not match the request public key", async () => {
    process.env.ALLOW_SERVER_SIGNING = "true";
    process.env.STELLAR_SECRET_KEY = SERVER_KEYPAIR.secret();

    const response = await POST(
      makeRequest(
        {
          network: "testnet",
          publicKey: OTHER_PUBLIC_KEY,
          payments: [
            {
              address: OWNER_PUBLIC_KEY,
              amount: "1",
              asset: "XLM",
            },
          ],
          idempotencyKey: "mismatch-key",
        },
        "mismatch-key",
      ) as never,
    );

    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toMatch(/publicKey/i);
    expect(mockProcessJobInBackground).toHaveBeenCalledTimes(0);
  });

  test("rejects a conflicting body that reuses the same key", async () => {
    const idempotencyKey = "conflicting-key";

    await POST(makeRequest(baseBody, idempotencyKey) as never);

    const conflictingBody = {
      ...baseBody,
      signedTransactions: ["BBBB"],
    };

    const response = await POST(makeRequest(conflictingBody, idempotencyKey) as never);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toMatch(/idempotency key/i);
    expect(mockProcessJobInBackground).toHaveBeenCalledTimes(1);
  });
});