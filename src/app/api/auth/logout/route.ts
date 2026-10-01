import { endSession } from "@/server/auth";
import { demoGuard, json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const guard = demoGuard();
  if (guard) return guard;
  await endSession();
  return json({ ok: true });
}
