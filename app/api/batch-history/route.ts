/**
 * GET /api/batch-history
 *
 * Returns paginated batch job history from the durable SQLite store.
 *
 * Query params:
 *   page    – 1-based page number (default 1)
 *   limit   – rows per page (default 20, max 100)
 *   status  – filter by job status (queued | processing | completed | failed)
 *   network – filter by network (testnet | mainnet)
 */

import { NextRequest, NextResponse } from "next/server";
import { StrKey } from "stellar-sdk";
import { getAllJobs, countJobs } from "@/lib/job-store";
import { safeJsonResponse } from "@/lib/safe-json";
import type { JobStatus } from "@/lib/stellar/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const rawStatus  = searchParams.get("status");
  const rawNetwork = searchParams.get("network");
  const publicKey = searchParams.get("publicKey");

  if (!publicKey || !StrKey.isValidEd25519PublicKey(publicKey)) {
    return NextResponse.json(
      { error: "A valid publicKey query parameter is required" },
      { status: 400 },
    );
  }

  const validStatuses: JobStatus[] = ["queued", "processing", "completed", "failed"];
  const status  = validStatuses.includes(rawStatus as JobStatus) ? (rawStatus as JobStatus) : undefined;
  const network = rawNetwork === "testnet" || rawNetwork === "mainnet" ? rawNetwork : undefined;

  try {
    const [jobs, total] = [
      getAllJobs({ limit, offset, status, network, publicKey }),
      countJobs({ status, network, publicKey }),
    ];

    // Strip the full payments array from the list response to keep payloads small.
    // Callers that need the full payment list should use GET /api/batch-status/:jobId.
    const items = jobs.map((j) => ({
      jobId:            j.jobId,
      status:           j.status,
      network:          j.network,
      totalBatches:     j.totalBatches,
      completedBatches: j.completedBatches,
      totalPayments:    j.payments.length,
      createdAt:        j.createdAt,
      updatedAt:        j.updatedAt,
      // Include summary from result if available
      summary:          j.result?.summary ?? null,
      totalAmount:      j.result?.totalAmount ?? null,
    }));

    return safeJsonResponse({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("batch-history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch history" },
      { status: 500 },
    );
  }
}
