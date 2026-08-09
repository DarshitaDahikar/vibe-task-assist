const COLORS = ["#f97362", "#f5b942", "#4ade80", "#60a5fa", "#c084fc"];

/**
 * Small celebratory confetti burst, positioned via CSS around wherever it's rendered.
 * Purely decorative — renders a handful of pieces that fall and fade, then unmounts itself.
 */
export function ConfettiBurst() {
  const pieces = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {pieces.map((_, i) => {
        const left = 10 + Math.random() * 80;
        const delay = Math.random() * 0.15;
        const color = COLORS[i % COLORS.length];
        const size = 6 + Math.random() * 4;
        return (
          <span
            key={i}
            className="animate-confetti-piece absolute top-0 rounded-sm"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              backgroundColor: color,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
