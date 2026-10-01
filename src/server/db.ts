import { promises as fs } from "node:fs";
import path from "node:path";
import type { SessionResult } from "@/lib/results";

/**
 * Minimal databas för lokalt backend-test: en JSON-fil i .data/.
 * Allt hålls i minnet och skrivs atomiskt (tmp-fil + rename) med debounce.
 * Byt mot Postgres/SQLite/Supabase genom att ersätta den här modulen.
 */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "larare" | "elev";
  school: string;
  passHash: string;
  salt: string;
  createdAt: string;
}

export interface AuthSessionRow {
  token: string;
  userId: string;
  expires: number;
}

interface Data {
  users: UserRow[];
  sessions: AuthSessionRow[];
  results: (SessionResult & { ownerId: string })[];
}

const FILE = path.join(process.cwd(), ".data", "klura.json");

type G = typeof globalThis & { __kluraDb?: { data: Data; timer: ReturnType<typeof setTimeout> | null; loaded: Promise<void> } };
const g = globalThis as G;

function state() {
  if (!g.__kluraDb) {
    const s = { data: { users: [], sessions: [], results: [] } as Data, timer: null as ReturnType<typeof setTimeout> | null, loaded: Promise.resolve() };
    s.loaded = fs
      .readFile(FILE, "utf8")
      .then((txt) => {
        s.data = { users: [], sessions: [], results: [], ...JSON.parse(txt) };
      })
      .catch(() => {});
    g.__kluraDb = s;
  }
  return g.__kluraDb;
}

export async function db(): Promise<Data> {
  const s = state();
  await s.loaded;
  return s.data;
}

export function save() {
  const s = state();
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(async () => {
    s.timer = null;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(s.data, null, 1));
    await fs.rename(tmp, FILE);
  }, 150);
}
