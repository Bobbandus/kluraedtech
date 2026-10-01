import { db } from "@/server/db";
import { publicUser, startSession, verifyPassword } from "@/server/auth";
import { body, clientIp, demoGuard, fail, json, rateLimit } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = demoGuard();
  if (guard) return guard;
  if (!rateLimit(`login:${clientIp(req)}`, 20, 60_000)) return fail("För många försök. Vänta en minut.", 429);
  const b = await body<{ email?: string; password?: string }>(req);
  const email = (b?.email ?? "").trim().toLowerCase();
  const data = await db();
  const user = data.users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(b?.password ?? "", user))) return fail("Fel e-post eller lösenord.", 401);
  await startSession(user.id);
  return json({ ok: true, user: publicUser(user) });
}
