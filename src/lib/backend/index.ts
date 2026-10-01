"use client";

import { DEMO_MODE } from "./config";
import { localTransport } from "./local-transport";
import { remoteTransport } from "./remote-transport";
import type { GameTransport } from "./transport";

export { DEMO_MODE } from "./config";
export type { GameTransport } from "./transport";

export function getTransport(): GameTransport {
  return DEMO_MODE ? localTransport : remoteTransport;
}

/** Värdnyckeln sparas per flik så att lärarvyn tål en omladdning. */
export function saveHostKey(code: string, key: string) {
  try {
    sessionStorage.setItem(`klura-host-${code}`, key);
  } catch {}
}
export function loadHostKey(code: string): string | null {
  try {
    return sessionStorage.getItem(`klura-host-${code}`);
  } catch {
    return null;
  }
}
export function savePlayerToken(code: string, tok: string) {
  try {
    sessionStorage.setItem(`klura-player-${code}`, tok);
  } catch {}
}
export function loadPlayerToken(code: string): string | null {
  try {
    return sessionStorage.getItem(`klura-player-${code}`);
  } catch {
    return null;
  }
}
