"use client";

import { useMemo, useState } from "react";
import { StudentNav } from "@/components/nav";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { GnistaIcon, PlusBadge } from "@/components/brand";
import { CountUp } from "@/components/game/parts";
import { SKINS, RARITY, ALPHA_SKIN, type Skin } from "@/data/skins";
import { useHydrated, useStore, levelFromXp } from "@/lib/store";
import s from "./shop.module.css";

type Filter = "alla" | "kopbara" | "agda";
const FEATURED = ["kassetten", "raven", "bullen"];

export default function Shop() {
  const hydrated = useHydrated();
  const st = useStore((x) => x.student);
  const buy = useStore((x) => x.buy);
  const equip = useStore((x) => x.equip);
  const [filter, setFilter] = useState<Filter>("alla");
  const [open, setOpen] = useState<Skin | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const level = levelFromXp(st.xp).level;

  const list = useMemo(() => {
    if (filter === "agda") return SKINS.filter((x) => st.owned.includes(x.id));
    if (filter === "kopbara") return SKINS.filter((x) => x.unlock.kind === "gnistor" && !st.owned.includes(x.id));
    return SKINS;
  }, [filter, st.owned]);

  const status = (sk: Skin) => {
    if (st.owned.includes(sk.id)) return st.skinId === sk.id ? "Används" : "Ägd";
    const u = sk.unlock;
    if (u.kind === "gnistor") return null;
    if (u.kind === "niva") return level >= u.level ? "Upplåst" : `Nivå ${u.level}`;
    if (u.kind === "bedrift") return "Bedrift";
    if (u.kind === "plus") return "Plus";
    if (u.kind === "alfa") return "Early alpha";
    return "Ägd";
  };

  return (
    <>
      <StudentNav />
      <main id="innehall" className="page" style={{ paddingBottom: 120 }}>
        <div className={s.head}>
          <div>
            <h1>Butiken</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Gnistor tjänar du genom att spela, klättra och klara uppdrag.
            </p>
          </div>
          <div className={s.balance} aria-label="Ditt saldo">
            <GnistaIcon size={28} />
            {hydrated ? <CountUp value={st.gnistor} /> : "–"}
          </div>
        </div>

        {hydrated && st.owned.includes(ALPHA_SKIN) && (
          <button className={s.alpha} onClick={() => setOpen(SKINS.find((x) => x.id === ALPHA_SKIN)!)}>
            <span className={s.alphaArt}>
              <Avatar skin={ALPHA_SKIN} size={118} className="avatar-hero" />
            </span>
            <span className={s.alphaText}>
              <span className={s.alphaBadge}>Early alpha · exklusiv</span>
              <span className={s.alphaName}>Laserdala</span>
              <span className={s.alphaSub}>Bara för dig som spelar nu. Kan inte köpas och kommer aldrig tillbaka.</span>
            </span>
            <span className={s.alphaState}>{st.skinId === ALPHA_SKIN ? "Används" : "Din"}</span>
          </button>
        )}

        <section className={s.featured} aria-labelledby="utvalt">
          <div className="row between wrap gap-8">
            <h2 id="utvalt" style={{ fontSize: "1.3rem" }}>
              Veckans utvalda
            </h2>
            <span className="chip" style={{ background: "rgba(255,255,255,.12)", color: "#c9e6d9" }}>
              <Icon name="clock" size={14} /> Byts om 3 d 14 h
            </span>
          </div>
          <div className={s.featGrid}>
            {FEATURED.map((id) => {
              const sk = SKINS.find((x) => x.id === id)!;
              const owned = hydrated && st.owned.includes(id);
              return (
                <button key={id} className={s.featItem} onClick={() => setOpen(sk)}>
                  <Avatar skin={id} size={68} />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.15rem" }}>{sk.name}</div>
                    <div style={{ color: "#8fd1b6", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{RARITY[sk.rarity].label}</div>
                    <div className="row gap-4" style={{ marginTop: 6, fontWeight: 700 }}>
                      {owned ? (
                        "Ägd"
                      ) : sk.unlock.kind === "gnistor" ? (
                        <>
                          <GnistaIcon size={16} /> {sk.unlock.price}
                        </>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className={s.filters} role="group" aria-label="Filter">
          {(
            [
              ["alla", "Alla figurer"],
              ["kopbara", "Kan köpas"],
              ["agda", "Mina"],
            ] as [Filter, string][]
          ).map(([k, l]) => (
            <button key={k} className="chip chip-btn" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>

        <div className={s.grid}>
          {list.map((sk) => {
            const r = RARITY[sk.rarity];
            const stt = hydrated ? status(sk) : null;
            const locked = stt === "Bedrift" || stt === "Plus" || (stt?.startsWith("Nivå") ?? false);
            return (
              <button key={sk.id} className={s.item} onClick={() => setOpen(sk)} aria-label={`${sk.name}, ${r.label}${stt ? `, ${stt}` : ""}`}>
                <div className={s.itemArt} style={{ background: r.tint }}>
                  <Avatar skin={sk.id} size={92} style={locked ? { filter: "saturate(.5)", opacity: 0.75 } : undefined} />
                  {locked && (
                    <span className={s.lockOverlay}>
                      <Icon name="lock" size={15} />
                    </span>
                  )}
                </div>
                <div className={s.itemName}>{sk.name}</div>
                <div className={s.rarity} style={{ color: r.color }}>
                  {r.label}
                </div>
                <div className={s.price}>
                  {stt === "Används" ? (
                    <span className="chip chip-brand">
                      <Icon name="check" size={14} stroke={3} /> Används
                    </span>
                  ) : stt === "Plus" ? (
                    <PlusBadge small />
                  ) : stt ? (
                    <span className="muted">{stt}</span>
                  ) : sk.unlock.kind === "gnistor" ? (
                    <>
                      <GnistaIcon size={17} /> {sk.unlock.price}
                    </>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className={s.note}>
          <Icon name="shield" size={22} style={{ color: "var(--brand)", marginTop: 2 }} />
          <div>
            <strong style={{ color: "var(--ink)" }}>Figurer påverkar aldrig spelet.</strong> Alla har samma chans att vinna – det är bara utseende. Och du ser alltid exakt vad du får: inga slumpkistor.
          </div>
        </div>
      </main>

      {open && (
        <ItemDialog
          skin={open}
          owned={st.owned.includes(open.id)}
          equipped={st.skinId === open.id}
          balance={st.gnistor}
          level={level}
          justBought={justBought === open.id}
          onClose={() => {
            setOpen(null);
            setJustBought(null);
          }}
          onBuy={() => {
            if (open.unlock.kind === "gnistor" && buy(open.id, open.unlock.price)) setJustBought(open.id);
          }}
          onEquip={() => equip(open.id)}
        />
      )}
    </>
  );
}

function ItemDialog({
  skin,
  owned,
  equipped,
  balance,
  level,
  justBought,
  onClose,
  onBuy,
  onEquip,
}: {
  skin: Skin;
  owned: boolean;
  equipped: boolean;
  balance: number;
  level: number;
  justBought: boolean;
  onClose: () => void;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const r = RARITY[skin.rarity];
  const u = skin.unlock;
  const levelUnlocked = u.kind === "niva" && level >= u.level;
  return (
    <div className="backdrop" onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="item-title" onClick={(e) => e.stopPropagation()}>
        <div className={s.dialogArt} style={{ background: r.tint }}>
          <Avatar skin={skin.id} size={160} className={justBought ? s.hop : skin.rarity === "alfa" || skin.rarity === "legendarisk" ? "avatar-hero" : "anim-bob"} />
          {justBought && (
            <div className={s.burst} aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                return (
                  <span key={i} style={{ ["--x" as string]: `${Math.cos(a) * 130}px`, ["--y" as string]: `${Math.sin(a) * 90}px` }}>
                    <GnistaIcon size={20} />
                  </span>
                );
              })}
            </div>
          )}
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Stäng" style={{ position: "absolute", right: 12, top: 12 }} autoFocus>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ color: r.color, fontWeight: 800, fontSize: "0.8rem", letterSpacing: ".06em", textTransform: "uppercase" }}>{r.label}</div>
          <h2 id="item-title" style={{ marginTop: 2 }}>
            {justBought ? `${skin.name} är din!` : skin.name}
          </h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {skin.blurb}
          </p>
          <div style={{ marginTop: 20 }}>
            {owned || levelUnlocked ? (
              equipped ? (
                <button className="btn btn-block btn-lg" disabled>
                  <Icon name="check" size={20} /> Används just nu
                </button>
              ) : (
                <button className="btn btn-primary btn-block btn-lg" onClick={onEquip}>
                  Använd {skin.name}
                </button>
              )
            ) : u.kind === "gnistor" ? (
              <>
                <button className="btn btn-accent btn-block btn-lg" disabled={balance < u.price} onClick={onBuy}>
                  Köp för <GnistaIcon size={20} /> {u.price}
                </button>
                {balance < u.price && (
                  <p className="muted" style={{ marginTop: 10, fontSize: "0.9rem", textAlign: "center" }}>
                    Du behöver {u.price - balance} gnistor till. Ungefär {Math.ceil((u.price - balance) / 60)} matcher.
                  </p>
                )}
              </>
            ) : u.kind === "niva" ? (
              <div className="chip" style={{ height: "auto", padding: "12px 14px", width: "100%", whiteSpace: "normal" }}>
                <Icon name="lock" size={16} /> Låses upp på nivå {u.level}. Du är på nivå {level}.
              </div>
            ) : u.kind === "bedrift" ? (
              <div className="chip chip-warn" style={{ height: "auto", padding: "12px 14px", width: "100%", whiteSpace: "normal" }}>
                <Icon name="trophy" size={16} /> Bedrift: {u.text}. Kan inte köpas.
              </div>
            ) : u.kind === "alfa" ? (
              <div className="chip" style={{ height: "auto", padding: "12px 14px", width: "100%", whiteSpace: "normal" }}>
                Delades ut till alla som spelade under early alpha.
              </div>
            ) : u.kind === "plus" ? (
              <div className="stack gap-8">
                <div className="row gap-8">
                  <PlusBadge /> <span className="muted">Ingår när din skola har Klura Plus.</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
