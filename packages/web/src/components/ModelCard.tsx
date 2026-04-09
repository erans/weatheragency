import { Link } from "react-router";
import { clsx } from "clsx";
import type { ModelStatus } from "@weatheragency/shared";
import { StatusBadge } from "./StatusBadge";
import { Sparkline } from "./Sparkline";

interface ModelCardProps {
  model: ModelStatus;
}

function scoreColor(score: number, reportCount: number): string {
  if (reportCount < 3) return "text-health-gray";
  if (score > 70) return "text-health-green";
  if (score > 40) return "text-health-amber";
  return "text-health-red";
}

function borderColor(score: number, reportCount: number): string {
  if (reportCount < 3) return "border-l-health-gray";
  if (score > 70) return "border-l-health-green";
  if (score > 40) return "border-l-health-amber";
  return "border-l-health-red";
}

function trendIcon(trend: string): string {
  if (trend === "improving") return "\u25B2";
  if (trend === "declining") return "\u25BC";
  return "\u2014";
}

export function ModelCard({ model }: ModelCardProps) {
  return (
    <Link
      to={`/model/${model.slug}`}
      className={clsx(
        "block rounded-lg border border-brand-border border-l-4 bg-brand-card p-4 transition-colors hover:border-brand-subtitle",
        borderColor(model.worst_score, model.report_count)
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-brand-subtitle">
          {model.provider}
        </span>
        <StatusBadge
          score={model.worst_score}
          dimension={model.worst_dimension}
          reportCount={model.report_count}
        />
      </div>

      <div className="mb-3 text-base font-semibold">{model.name}</div>

      <div className="mb-2 flex items-baseline gap-2">
        <span
          className={clsx(
            "text-3xl font-bold",
            scoreColor(model.worst_score, model.report_count)
          )}
        >
          {Math.round(model.worst_score)}
        </span>
        <span className="text-sm text-brand-muted">/100</span>
        <span
          className={clsx(
            "ml-auto text-xs",
            model.trend === "improving"
              ? "text-health-green"
              : model.trend === "declining"
                ? "text-health-red"
                : "text-brand-muted"
          )}
        >
          {trendIcon(model.trend)} {model.trend}
        </span>
      </div>

      <Sparkline score={model.worst_score} />

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-brand-muted">
          {model.report_count} reports in last 30m
        </span>
      </div>

      {/* Mini endpoint indicators */}
      <div className="mt-2 flex gap-1.5">
        {model.endpoints.map((ep) => (
          <div
            key={ep.id}
            className="flex items-center gap-1 rounded bg-brand-bg px-1.5 py-0.5 text-[10px] text-brand-muted"
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  ep.score > 70
                    ? "rgb(34, 197, 94)"
                    : ep.score > 40
                      ? "rgb(245, 158, 11)"
                      : "rgb(239, 68, 68)",
              }}
            />
            {ep.label.replace(/ (API|AI)$/, "")}
          </div>
        ))}
      </div>
    </Link>
  );
}
