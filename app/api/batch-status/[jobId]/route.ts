/**
 * API route for polling batch job status.
 *
 * GET /api/batch-status/:jobId
 *
 * Returns the current state of a queued/processing/completed batch job.
 * Frontend polls this endpoint every ~2 seconds to drive the progress bar.
 */

import { NextRequest, NextResponse } from "next/server";
import { StrKey } from "stellar-sdk";
import { getJob } from "@/lib/job-store";
import { safeJsonResponse } from "@/lib/safe-json";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params;
  const publicKey = request.nextUrl.searchParams.get("publicKey");

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing jobId parameter" },
      { status: 400 },
    );
  }

  if (!publicKey || !StrKey.isValidEd25519PublicKey(publicKey)) {
    return NextResponse.json(
      { error: "A valid publicKey query parameter is required" },
      { status: 400 },
    );
  }

  const job = getJob(jobId, publicKey);

  if (!job) {
    return NextResponse.json(
      { error: `Job not found: ${jobId}` },
      { status: 404 },
    );
  }

  // Return a safe, minimal response — no need to echo back the full payments array.
  // Use safeJsonResponse to handle any BigInt values from Stellar SDK results.
  return safeJsonResponse({
    jobId: job.jobId,
    status: job.status,
    totalBatches: job.totalBatches,
    completedBatches: job.completedBatches,
    totalPayments: job.payments.length,
    network: job.network,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    // Only present when status === 'completed'
    result: job.result,
    // Only present when status === 'failed'
    error: job.error,
  });
}
