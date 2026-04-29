/**
 * API route for submitting batch payments to Stellar (async / non-blocking).
 *
 * Supports two modes:
 * 1. Server-side signing: Provide payments + STELLAR_SECRET_KEY env var
 * 2. Client-side signing: Provide pre-signed transaction envelopes (XDRs)
 *
 * Returns 202 Accepted immediately with a jobId.
 * Frontend polls /api/batch-status/:jobId for progress.
 */

import { NextRequest, NextResponse } from "next/server";
import { validatePaymentInstructions } from "@/lib/stellar";
import { MAX_UPLOAD_ROWS } from "@/lib/stellar/parser";
import { safeJsonResponse } from "@/lib/safe-json";
import { createJob } from "@/lib/job-store";
import { processJobInBackground } from "@/lib/stellar/batch-worker";
import type { PaymentInstruction } from "@/lib/stellar/types";
import { applyRateLimit, setRateLimitHeaders } from "@/lib/api-rate-limit";

interface RequestBody {
  payments?: PaymentInstruction[];
  network: "testnet" | "mainnet";
  // #300: Support for client-side signed transactions (XDR format)
  signedTransactions?: string[];
}

export async function POST(request: NextRequest) {
  const rate = applyRateLimit(request, "batch-submit");
  if (rate.blocked) return rate.response!;

  try {
    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { payments, signedTransactions, network } = body;

    // Validate network
    if (!["testnet", "mainnet"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network: must be 'testnet' or 'mainnet'" },
        { status: 400 },
      );
    }

    // #300: Support two submission modes:
    // Mode 1: Client-side signed transactions (pre-signed XDRs)
    if (signedTransactions && signedTransactions.length > 0) {
      if (!Array.isArray(signedTransactions)) {
        return NextResponse.json(
          { error: "signedTransactions must be an array of XDR strings" },
          { status: 400 },
        );
      }

      if (signedTransactions.length > MAX_UPLOAD_ROWS) {
        return NextResponse.json(
          { error: `Batch exceeds the maximum of ${MAX_UPLOAD_ROWS} transactions per upload.` },
          { status: 400 },
        );
      }

      // Create a job for pre-signed transactions
      // signedTransactions are passed as-is without needing a secret key
      const jobId = createJob([], network, signedTransactions);
      void processJobInBackground(jobId, [], network, undefined, signedTransactions);

      return setRateLimitHeaders(safeJsonResponse(
        {
          jobId,
          status: "queued",
          totalTransactions: signedTransactions.length,
          message:
            "Pre-signed batch queued for processing. Poll /api/batch-status/" +
            jobId +
            " for progress.",
        },
        { status: 202 },
      ), rate);
    }

    // Mode 2: Server-side signing (legacy, requires STELLAR_SECRET_KEY)
    if (!payments || payments.length === 0) {
      return NextResponse.json(
        { error: "Either 'payments' or 'signedTransactions' must be provided" },
        { status: 400 },
      );
    }

    // Get secret key from environment
    const secretKey = process.env.STELLAR_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "STELLAR_SECRET_KEY is not configured. Please use client-side signing or configure server-side signing." },
        { status: 500 },
      );
    }

    // Validate input
    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: payments must be a non-empty array" },
        { status: 400 },
      );
    }

    if (payments.length > MAX_UPLOAD_ROWS) {
      return NextResponse.json(
        { error: `Batch exceeds the maximum of ${MAX_UPLOAD_ROWS} payments per upload.` },
        { status: 400 },
      );
    }

    // Validate payments
    const validation = validatePaymentInstructions(payments);
    if (!validation.valid) {
      const errors = Array.from(validation.errors.entries())
        .map(([idx, err]) => `Row ${idx}: ${err}`)
        .slice(0, 5);
      return NextResponse.json(
        { error: `Invalid payment instructions: ${errors.join("; ")}` },
        { status: 400 },
      );
    }

    // Create a job in the store — returns a UUID immediately
    const jobId = createJob(payments, network);

    // Fire-and-forget: start background processing without awaiting
    void processJobInBackground(jobId, payments, network, secretKey);

    // Return 202 Accepted with the job ID for polling
    return setRateLimitHeaders(safeJsonResponse(
      {
        jobId,
        status: "queued",
        totalPayments: payments.length,
        message:
          "Batch queued for processing. Poll /api/batch-status/" +
          jobId +
          " for progress.",
      },
      { status: 202 },
    ), rate);
  } catch (error) {
    console.error("Batch submission error:", error);
    return setRateLimitHeaders(safeJsonResponse(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    ), rate);
  }
}
