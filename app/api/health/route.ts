import { NextResponse } from "next/server";
import { checkPersistenceHealth } from "@/lib/persistence-health";

export async function GET() {
  const health = checkPersistenceHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
