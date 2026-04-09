interface SparklineProps {
  score: number;
}

export function Sparkline({ score }: SparklineProps) {
  const color =
    score > 70
      ? "rgb(34, 197, 94)"
      : score > 40
        ? "rgb(245, 158, 11)"
        : "rgb(239, 68, 68)";

  const bars = 7;
  const heights = Array.from({ length: bars }, (_, i) => {
    const variation = Math.sin(i * 0.8) * 4;
    return Math.max(2, Math.min(30, (score / 100) * 30 + variation));
  });

  return (
    <div className="flex items-end gap-0.5" style={{ height: 30 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: h,
            backgroundColor: color,
            borderRadius: 2,
            opacity: 0.5 + (i / bars) * 0.5,
          }}
        />
      ))}
    </div>
  );
}
