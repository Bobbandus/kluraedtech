"use client";

import { useEffect } from "react";
import { useHydrated, useStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const reduced = useStore((s) => s.prefs.reducedMotion);
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [hydrated, reduced]);
  return <>{children}</>;
}
