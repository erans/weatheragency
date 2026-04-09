import { clsx } from "clsx";

interface StatusBadgeProps {
  score: number;
  dimension?: "availability" | "quality";
  reportCount?: number;
}

function getLabel(score: number, dimension?: string, reportCount?: number): string {
  if (reportCount !== undefined && reportCount < 3) return "Low data";
  if (dimension === "quality" && score < 70) return "Quality issues";
  if (score > 70) return "Operational";
  if (score > 40) return "Degraded";
  return "Down";
}

function getColor(score: number, reportCount?: number): string {
  if (reportCount !== undefined && reportCount < 3)
    return "text-health-gray bg-health-gray/15";
  if (score > 70) return "text-health-green bg-health-green/15";
  if (score > 40) return "text-health-amber bg-health-amber/15";
  return "text-health-red bg-health-red/15";
}

export function StatusBadge({ score, dimension, reportCount }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-xs",
        getColor(score, reportCount)
      )}
    >
      {getLabel(score, dimension, reportCount)}
    </span>
  );
}
