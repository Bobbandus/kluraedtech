"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TeacherNav } from "@/components/nav";
import { DEMO_MODE } from "@/lib/backend";
import { authApi } from "@/lib/backend/auth-client";
import { useStore } from "@/lib/store";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const login = useStore((x) => x.login);
  const [ok, setOk] = useState(DEMO_MODE);

  // Med riktig backend: kräv inloggad lärare
  useEffect(() => {
    if (DEMO_MODE) return;
    authApi.me().then((u) => {
      if (!u || u.role !== "larare") router.replace("/logga-in");
      else {
        login({ name: u.name, school: u.school });
        setOk(true);
      }
    });
  }, [router, login]);

  if (!ok) return null;
  // Värdvyn (projektorn) visas i helskärm utan meny
  if (path.startsWith("/larare/live")) return <>{children}</>;
  return (
    <>
      <TeacherNav />
      {children}
    </>
  );
}
