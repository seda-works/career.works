// Brand mark — a mono lowercase "c" on a sun-yellow tile, the Career.works
// sibling of the seda.works "s" tile. Matches the favicon (src/app/icon.svg).
export function CoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center bg-sun font-mono font-semibold text-ink"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
    >
      c
    </span>
  );
}
