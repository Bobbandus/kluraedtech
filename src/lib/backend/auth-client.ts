"use client";

/** Klient för kontoendpoints (används bara när DEMO_MODE = false). */

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "larare" | "elev";
  school: string;
}

type Res = { ok: true; user: ApiUser } | { ok: false; error: string };

async function call(url: string, body?: unknown): Promise<Res> {
  try {
    const res = await fetch(url, body === undefined ? { credentials: "same-origin" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
    const data = await res.json();
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? "Något gick fel." };
    return data;
  } catch {
    return { ok: false, error: "Kunde inte nå servern." };
  }
}

export const authApi = {
  register: (b: { name: string; email: string; password: string; role: "larare" | "elev"; school?: string }) => call("/api/auth/register", b),
  login: (b: { email: string; password: string }) => call("/api/auth/login", b),
  logout: () => call("/api/auth/logout", {}),
  async me(): Promise<ApiUser | null> {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      const data = await res.json();
      return data.user ?? null;
    } catch {
      return null;
    }
  },
};
