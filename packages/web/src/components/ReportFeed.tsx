import type { PublicReport } from "@weatheragency/shared";

interface ReportFeedProps {
  reports: PublicReport[];
}

function dotColor(report: PublicReport): string {
  const status = report.status ?? report.quality;
  if (status === "working" || status === "good") return "bg-health-green";
  if (status === "degraded" || status === "poor") return "bg-health-amber";
  return "bg-health-red";
}

function statusLabel(report: PublicReport): { text: string; color: string } {
  if (report.status) {
    const colors: Record<string, string> = {
      working: "text-health-green",
      degraded: "text-health-amber",
      down: "text-health-red",
    };
    return { text: report.status, color: colors[report.status] ?? "" };
  }
  if (report.quality) {
    const colors: Record<string, string> = {
      good: "text-health-green",
      poor: "text-health-amber",
      unusable: "text-health-red",
    };
    return { text: report.quality, color: colors[report.quality] ?? "" };
  }
  return { text: "", color: "" };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ReportFeed({ reports }: ReportFeedProps) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-brand-border bg-brand-card p-8 text-center text-brand-muted">
        No recent reports
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-card">
      {reports.map((report, i) => {
        const label = statusLabel(report);
        return (
          <div
            key={report.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < reports.length - 1 ? "border-b border-brand-border" : ""
            }`}
          >
            <div className={`h-2 w-2 shrink-0 rounded-full ${dotColor(report)}`} />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{report.model_name}</span>
              <span className={`ml-2 text-sm ${label.color}`}>
                {label.text}
              </span>
              {report.body && (
                <span className="ml-2 text-sm text-brand-muted">
                  — {report.body.slice(0, 80)}
                  {report.body.length > 80 ? "..." : ""}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {report.harness && (
                <span className="rounded bg-brand-bg px-1.5 py-0.5 text-[11px] text-brand-muted">
                  {report.harness}
                  {report.harness_version ? ` v${report.harness_version}` : ""}
                </span>
              )}
              {report.region && (
                <span className="text-[11px] text-brand-muted">
                  {report.region}
                </span>
              )}
              <span className="text-[11px] text-brand-muted">
                {timeAgo(report.created_at)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
