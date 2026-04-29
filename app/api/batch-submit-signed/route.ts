/**
 * API route for submitting a pre-signed Stellar transaction.
 *
 * POST /api/batch-submit-signed
 *
 * Accepts { signedXdr, network } where signedXdr is the base64-encoded
 * XDR of a transaction that has already been signed by the user's wallet.
 *
 * On low-fee errors, returns feeEstimate and currentNetworkFee to allow retry with higher fees.
 */

import { NextRequest, NextResponse } from "next/server";
import { TransactionBuilder, Horizon, Networks } from "stellar-sdk";
import { safeJsonResponse } from "@/lib/safe-json";
import { applyRateLimit, setRateLimitHeaders } from "@/lib/api-rate-limit";

interface RequestBody {
    signedXdr: string;
    network: "testnet" | "mainnet";
}

interface FeeStats {
    last_ledger_base_fee?: string;
    ledger_capacity_usage?: string;
}

async function getFeeStats(server: Horizon.Server): Promise<FeeStats> {
    try {
        const response = await fetch(server.serverURL + "/fee_stats");
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch fee stats:", error);
        return {};
    }
}

function isInsufficientFeeError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const horizonError = error as any;

    const resultCodes = horizonError.response?.data?.extras?.result_codes;
    if (!resultCodes) return false;

    const txResult = resultCodes.transaction;
    return txResult === "tx_insufficient_fee" || txResult === "tx_bad_seq";
}

export async function POST(request: NextRequest) {
    const rate = applyRateLimit(request, "batch-submit-signed");
    if (rate.blocked) return rate.response!;

    try {
        const body = (await request.json()) as RequestBody;
        const { signedXdr, network } = body;

        // ── Validate inputs ──────────────────────────────────────────

        if (!signedXdr || typeof signedXdr !== "string") {
            return NextResponse.json(
                { error: "signedXdr is required" },
                { status: 400 },
            );
        }

        if (!["testnet", "mainnet"].includes(network)) {
            return NextResponse.json(
                { error: "network must be 'testnet' or 'mainnet'" },
                { status: 400 },
            );
        }

        // ── Rehydrate and submit ─────────────────────────────────────

        const networkPassphrase =
            network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;

        const transaction = TransactionBuilder.fromXDR(
            signedXdr,
            networkPassphrase,
        );

        const serverUrl =
            network === "testnet"
                ? "https://horizon-testnet.stellar.org"
                : "https://horizon.stellar.org";
        const server = new Horizon.Server(serverUrl);

        try {
            const result = await server.submitTransaction(transaction);

            return setRateLimitHeaders(safeJsonResponse({
                success: true,
                hash: result.hash,
                ledger: result.ledger,
            }), rate);
        } catch (submissionError: unknown) {
            // Check if this is a low-fee error and provide fee guidance
            if (isInsufficientFeeError(submissionError)) {
                const feeStats = await getFeeStats(server);
                const currentBaseFee = Number(feeStats.last_ledger_base_fee || "100");
                const estimatedFee = (currentBaseFee * 300).toString(); // 300 ops is typical batch size

                return setRateLimitHeaders(safeJsonResponse(
                    {
                        success: false,
                        error: "Transaction fees are insufficient for current network conditions",
                        code: "insufficient_fee",
                        currentNetworkFee: currentBaseFee,
                        estimatedRequiredFee: estimatedFee,
                        guidance: `Network base fee is ${currentBaseFee} stroops. Consider retrying with a fee of at least ${estimatedFee} stroops.`,
                    },
                    { status: 400 },
                ), rate);
            }

            throw submissionError;
        }
    } catch (error: unknown) {
        console.error("Submit signed tx error:", error);

        // Extract Horizon-specific error details if available
        const horizonExtras =
            error && typeof error === "object" && "response" in error
                ? (error as { response?: { data?: { extras?: { result_codes?: unknown } } } })
                    .response?.data?.extras?.result_codes
                : undefined;

        return setRateLimitHeaders(safeJsonResponse(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : "Transaction submission failed",
                resultCodes: horizonExtras,
            },
            { status: 400 },
        ), rate);
    }
}
