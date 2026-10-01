import { currentUser, publicUser } from "@/server/auth";
import { demoGuard, json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = demoGuard();
  if (guard) return guard;
  const u = await currentUser();
  return json({ ok: true, user: u ? publicUser(u) : null });
}
