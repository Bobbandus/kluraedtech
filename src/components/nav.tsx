"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Gnistor, Wordmark, PlusBadge } from "./brand";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icons";
import { useHydrated, useStore } from "@/lib/store";
import { DEMO_MODE } from "@/lib/backend";
import { authApi } from "@/lib/backend/auth-client";
import { AlphaGift } from "./AlphaGift";
import s from "./nav.module.css";

const STUDENT_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/spela", label: "Spela", icon: "play" },
  { href: "/butik", label: "Butik", icon: "bag" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export function StudentNav() {
  const path = usePathname();
  const hydrated = useHydrated();
  const st = useStore((x) => x.student);
  return (
    <>
      <header className={s.bar}>
        <div className={s.inner}>
          <Wordmark size={30} />
          <nav className={s.links} aria-label="Elevmeny">
            {STUDENT_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={`${s.link} ${path.startsWith(l.href) ? s.active : ""}`} aria-current={path.startsWith(l.href) ? "page" : undefined}>
                <Icon name={l.icon} size={18} />
                {l.label}
              </Link>
            ))}
          </nav>
          <div className={s.right}>
            <Link href="/butik" className={s.balance} aria-label={`Du har ${hydrated ? st.gnistor : ""} gnistor`}>
              <Gnistor amount={hydrated ? st.gnistor : 0} />
            </Link>
            <Link href="/profil" className={s.me}>
              <span className={s.meAvatar}>
                <Avatar skin={hydrated ? st.skinId : "mosse"} size={30} />
              </span>
              <span className={s.meName}>{hydrated && st.nickname ? st.nickname : "Min profil"}</span>
            </Link>
          </div>
        </div>
      </header>
      <AlphaGift />
      <nav className={s.tabs} aria-label="Elevmeny">
        {STUDENT_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`${s.tab} ${path.startsWith(l.href) ? s.tabActive : ""}`}>
            <Icon name={l.icon} size={22} />
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

const TEACHER_LINKS = [
  { href: "/larare", label: "Översikt", exact: true },
  { href: "/larare/quiz", label: "Mina quiz" },
  { href: "/larare/upptack", label: "Upptäck" },
  { href: "/larare/resultat", label: "Resultat" },
];

export function TeacherNav() {
  const path = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const teacher = useStore((x) => x.teacher);
  const logout = useStore((x) => x.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const isActive = (l: (typeof TEACHER_LINKS)[number]) => (l.exact ? path === l.href : path.startsWith(l.href));
  const links = TEACHER_LINKS.map((l) => (
    <Link key={l.href} href={l.href} className={`${s.link} ${isActive(l) ? s.active : ""}`} aria-current={isActive(l) ? "page" : undefined}>
      {l.label}
    </Link>
  ));

  return (
    <header className={s.bar}>
      <div className={s.inner}>
        <Wordmark href="/larare" size={30} />
        <nav className={s.links} aria-label="Lärarmeny">
          {links}
        </nav>
        <div className={s.right}>
          <Link href="/larare/quiz/ny" className={`btn btn-primary btn-sm ${s.hideSm}`}>
            <Icon name="plus" size={18} />
            Skapa quiz
          </Link>
          <div className={s.teacherMenu} ref={ref}>
            <button className={s.me} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
              <span className={s.meAvatar}>
                <Avatar skin="raven" size={30} />
              </span>
              <span className={s.meName}>{hydrated ? teacher.name.split(" ")[0] : "Sara"}</span>
              <Icon name="chevronDown" size={16} />
            </button>
            {open && (
              <div className={s.dropdown} role="menu">
                <div className={s.dropHead}>
                  <div style={{ fontWeight: 700 }}>{teacher.name}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {teacher.school}
                  </div>
                </div>
                <Link href="/larare/quiz/ny" role="menuitem" onClick={() => setOpen(false)}>
                  <Icon name="plus" size={18} /> Skapa quiz
                </Link>
                <button role="menuitem" onClick={() => setOpen(false)}>
                  <Icon name="sparkle" size={18} /> Generera quiz från text <PlusBadge small />
                </button>
                <Link href="/" role="menuitem" onClick={() => setOpen(false)}>
                  <Icon name="home" size={18} /> Elevsidan
                </Link>
                <button
                  role="menuitem"
                  onClick={async () => {
                    if (!DEMO_MODE) await authApi.logout();
                    logout();
                    router.push("/");
                  }}
                >
                  <Icon name="logout" size={18} /> Logga ut
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <nav className={s.teacherTabs} aria-label="Lärarmeny">
        {links}
      </nav>
    </header>
  );
}
