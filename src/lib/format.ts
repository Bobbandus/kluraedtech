export function formatCode(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 6);
  return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
}

export const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");
