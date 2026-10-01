import { randomUUID } from "node:crypto";
import { db, save } from "@/server/db";
import { hashPassword, publicUser, startSession } from "@/server/auth";
import { body, clientIp, demoGuard, fail, json, rateLimit } from "@/server/http";
import { checkName } from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = demoGuard();
  if (guard) return guard;
  if (!rateLimit(`reg:${clientIp(req)}`, 10, 60_000)) return fail("För många försök. Vänta en minut.", 429);
  const b = await body<{ name?: string; email?: string; password?: string; role?: string; school?: string }>(req);
  const name = (b?.name ?? "").trim().slice(0, 40);
  const email = (b?.email ?? "").trim().toLowerCase().slice(0, 120);
  const password = b?.password ?? "";
  if (!name || !checkName(name.split(" ")[0]).ok) return fail("Ange ett namn.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Ange en giltig e-postadress.");
  if (password.length < 8) return fail("Lösenordet behöver minst 8 tecken.");
  const data = await db();
  if (data.users.some((u) => u.email === email)) return fail("Det finns redan ett konto med den e-postadressen.", 409);
  const { hash, salt } = await hashPassword(password);
  const user = {
    id: randomUUID(),
    email,
    name,
    role: b?.role === "elev" ? ("elev" as const) : ("larare" as const),
    school: (b?.school ?? "").trim().slice(0, 80),
    passHash: hash,
    salt,
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  save();
  await startSession(user.id);
  return json({ ok: true, user: publicUser(user) });
}
