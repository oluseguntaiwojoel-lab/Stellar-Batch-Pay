import { NextRequest, NextResponse } from "next/server";
import { registerWebhook, getWebhooks, unregisterWebhook } from "@/lib/webhooks";
import { safeJsonResponse } from "@/lib/safe-json";
import { applyRateLimit, setRateLimitHeaders } from "@/lib/api-rate-limit";

export async function GET() {
  return safeJsonResponse({ webhooks: getWebhooks() });
}

export async function POST(request: NextRequest) {
  const rate = applyRateLimit(request, "webhook-register");
  if (rate.blocked) return rate.response!;

  try {
    const { url, events, secret } = await request.json();

    if (!url || !Array.isArray(events)) {
      return safeJsonResponse({ error: "Invalid request. 'url' and 'events' (array) are required." }, { status: 400 });
    }

    const webhook = registerWebhook(url, events, secret);
    return setRateLimitHeaders(
      safeJsonResponse({ message: "Webhook registered successfully", webhook }, { status: 201 }),
      rate,
    );
  } catch (error) {
    return setRateLimitHeaders(safeJsonResponse({ error: "Internal server error" }, { status: 500 }), rate);
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return safeJsonResponse({ error: "Missing webhook ID" }, { status: 400 });
  }

  const success = unregisterWebhook(id);
  if (success) {
    return safeJsonResponse({ message: "Webhook unregistered successfully" });
  } else {
    return safeJsonResponse({ error: "Webhook not found" }, { status: 404 });
  }
}
