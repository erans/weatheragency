import { clsx } from "clsx";
import type { EndpointHealth } from "@weatheragency/shared";

interface EndpointRowProps {
  endpoint: EndpointHealth;
}

export function EndpointRow({ endpoint }: EndpointRowProps) {
  const color =
    endpoint.score > 70
      ? "text-health-green"
      : endpoint.score > 40
        ? "text-health-amber"
        : "text-health-red";

  const dotColor =
    endpoint.score > 70
      ? "bg-health-green"
      : endpoint.score > 40
        ? "bg-health-amber"
        : "bg-health-red";

  return (
    <div className="flex items-center gap-4 border-b border-brand-border px-4 py-3 last:border-b-0">
      <div className={clsx("h-2 w-2 shrink-0 rounded-full", dotColor)} />
      <div className="flex-1">
        <div className="font-medium">{endpoint.label}</div>
        <div className="text-xs text-brand-muted">
          {endpoint.is_official ? "Official" : endpoint.hosting_provider}
          {" \u00B7 "}
          {endpoint.report_count} reports
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx("text-xl font-bold", color)}>
          {Math.round(endpoint.score)}
        </span>
        <span className="text-xs text-brand-muted">/100</span>
      </div>
      <span
        className={clsx(
          "text-xs",
          endpoint.trend === "improving"
            ? "text-health-green"
            : endpoint.trend === "declining"
              ? "text-health-red"
              : "text-brand-muted"
        )}
      >
        {endpoint.trend === "improving"
          ? "\u25B2 improving"
          : endpoint.trend === "declining"
            ? "\u25BC declining"
            : "\u2014 stable"}
      </span>
    </div>
  );
}
