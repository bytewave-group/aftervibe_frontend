type Props = {
  className?: string;
  variant?: "burst" | "confetti";
};

const BURST_RAYS = 10;
const CONFETTI = [
  { x: -28, y: -36, rot: -28, color: "#ff5a5a", delay: "0ms" },
  { x: 26, y: -40, rot: 22, color: "#ffd56a", delay: "40ms" },
  { x: -36, y: -8, rot: -12, color: "#ffffff", delay: "20ms" },
  { x: 38, y: -10, rot: 16, color: "#ff8a8a", delay: "60ms" },
  { x: -18, y: 28, rot: -8, color: "#ffd56a", delay: "80ms" },
  { x: 20, y: 30, rot: 10, color: "#ff5a5a", delay: "50ms" },
  { x: 0, y: -44, rot: 4, color: "#ffffff", delay: "10ms" },
  { x: -8, y: 36, rot: 0, color: "#ff8a8a", delay: "90ms" },
];

export function MotionBurst({ className = "", variant = "burst" }: Props) {
  if (variant === "confetti") {
    return (
      <span className={`pointer-events-none absolute inset-0 overflow-visible ${className}`} aria-hidden>
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className="anim-confetti-piece absolute left-1/2 top-1/2 h-2 w-1.5 rounded-[1px]"
            style={{
              background: piece.color,
              // CSS vars consumed by the keyframe
              ["--cx" as string]: `${piece.x}px`,
              ["--cy" as string]: `${piece.y}px`,
              ["--crot" as string]: `${piece.rot}deg`,
              animationDelay: piece.delay,
            }}
          />
        ))}
      </span>
    );
  }

  return (
    <span className={`pointer-events-none absolute inset-0 overflow-visible ${className}`} aria-hidden>
      <span className="anim-burst-ring absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ff5a5a]" />
      {Array.from({ length: BURST_RAYS }, (_, i) => (
        <span
          key={i}
          className="anim-burst-ray absolute left-1/2 top-1/2 h-2.5 w-1 origin-bottom rounded-full bg-[#ffd56a]"
          style={{
            transform: `rotate(${(360 / BURST_RAYS) * i}deg) translateY(-18px)`,
            animationDelay: `${i * 18}ms`,
          }}
        />
      ))}
    </span>
  );
}
