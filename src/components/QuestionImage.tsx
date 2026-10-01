/* eslint-disable @next/next/no-img-element */

/** Bild till en fråga. Alltid inom ramen, aldrig beskuren. */
export function QuestionImage({ src, maxHeight = 240, className }: { src?: string; maxHeight?: number | string; className?: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt="Bild till frågan"
      className={className}
      style={{ display: "block", maxWidth: "100%", maxHeight, width: "auto", height: "auto", margin: "0 auto 14px", borderRadius: 14, objectFit: "contain" }}
    />
  );
}
