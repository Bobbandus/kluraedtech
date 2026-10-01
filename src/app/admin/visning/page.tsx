"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HostGame from "@/components/game/HostGame";
import StudentGame from "@/components/game/StudentGame";
import { Icon } from "@/components/icons";
import s from "../admin.module.css";

/** Delad skärm: projektorn och en elevmobil i samma fönster (samma rum). */
function Inner() {
  const sp = useSearchParams();
  const code = (sp.get("kod") ?? "").replace(/\D/g, "").slice(0, 6);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 70) / 820));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className={s.split}>
      <section className={s.projector} aria-label="Projektorn">
        <HostGame key={code} code={code} keyboard={false} />
      </section>
      <aside className={s.side} aria-label="Elevens mobil">
        <div className={s.sideTop} style={{ width: 410 * scale }}>
          <span>Elevens mobil</span>
          <Link href="/admin" className="row gap-4">
            <Icon name="arrowLeft" size={15} /> Visningsläge
          </Link>
        </div>
        <div style={{ width: 410 * scale, height: 820 * scale }}>
          <div className={s.phone} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <div className={s.screen}>
              <StudentGame key={code} code={code} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
