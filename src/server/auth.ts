import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db, save, type UserRow } from "./db";

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const COOKIE = "klura_session";
const DAYS = 14;

export async function hashPassword(pw: string, salt = randomBytes(16).toString("hex")) {
  const buf = await scrypt(pw, salt, 64);
  return { hash: buf.toString("hex"), salt };
}

export async function verifyPassword(pw: string, user: UserRow) {
  const { hash } = await hashPassword(pw, user.salt);
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passHash, "hex"));
}

export async function startSession(userId: string) {
  const data = await db();
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + DAYS * 86400_000;
  data.sessions = data.sessions.filter((s) => s.expires > Date.now());
  data.sessions.push({ token, userId, expires });
  save();
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: DAYS * 86400, secure: false });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const data = await db();
    data.sessions = data.sessions.filter((s) => s.token !== token);
    save();
  }
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const data = await db();
  const s = data.sessions.find((x) => x.token === token && x.expires > Date.now());
  return s ? (data.users.find((u) => u.id === s.userId) ?? null) : null;
}

export function publicUser(u: UserRow) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, school: u.school };
}
