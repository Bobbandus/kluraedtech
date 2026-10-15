/**
 * Håller koll på om ett element syns i fönstret, så att levande
 * förhandsvisningar kan sluta rita när de inte syns (sparar batteri
 * och processor på skolans datorer).
 */
export function onScreen(el: Element): { visible: boolean; stop: () => void } {
  const s = { visible: true, stop: () => {} };
  if (typeof IntersectionObserver === "undefined") return s;
  let inView = true;
  const update = () => (s.visible = inView && !document.hidden);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) inView = e.isIntersecting;
      update();
    },
    { rootMargin: "120px" },
  );
  io.observe(el);
  const onVis = () => update();
  document.addEventListener("visibilitychange", onVis);
  s.stop = () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
  return s;
}
