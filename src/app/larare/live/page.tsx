"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HostGame from "@/components/game/HostGame";

function Inner() {
  const sp = useSearchParams();
  const code = (sp.get("kod") ?? "").replace(/\D/g, "").slice(0, 6);
  return <HostGame key={code} code={code} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
