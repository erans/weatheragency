import { useState } from "react";
import { useParams } from "react-router";
import { useModel, useAnalytics } from "../hooks/useModel";
import { useReports } from "../hooks/useReports";
import { StatusBadge } from "../components/StatusBadge";
import { EndpointRow } from "../components/EndpointRow";
import { HealthChart } from "../components/HealthChart";
import { ReportFeed } from "../components/ReportFeed";
import { clsx } from "clsx";

export function ModelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [period, setPeriod] = useState("24h");

  // Slug is used as the model ID for API calls
  const { data: modelData, isLoading } = useModel(slug ?? "");
  const { data: analytics } = useAnalytics(slug ?? "", { period });
  const { data: reports } = useReports({ model_id: slug, limit: 20 });

  if (isLoading || !modelData) {
    return <div className="text-brand-muted">Loading...</div>;
  }

  const { model, endpoints } = modelData;
  if (endpoints.length === 0) {
    return <div className="text-brand-muted">No endpoints found for this model.</div>;
  }
  const worstEndpoint = endpoints.reduce(
    (worst, ep) => (ep.score < worst.score ? ep : worst),
    endpoints[0]
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <span className="text-sm uppercase tracking-wide text-brand-subtitle">
          {model.provider}
        </span>
        <h1 className="mt-1 text-2xl font-bold">{model.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <span
            className={clsx(
              "text-3xl font-bold",
              worstEndpoint.score > 70
                ? "text-health-green"
                : worstEndpoint.score > 40
                  ? "text-health-amber"
                  : "text-health-red"
            )}
          >
            {Math.round(worstEndpoint.score)}
          </span>
          <span className="text-brand-muted">/100</span>
          <StatusBadge score={worstEndpoint.score} />
        </div>
      </div>

      {/* Endpoint breakdown */}
      <h2 className="mb-3 text-lg font-semibold">Endpoints</h2>
      <div className="mb-8 overflow-hidden rounded-lg border border-brand-border bg-brand-card">
        {endpoints.map((ep) => (
          <EndpointRow key={ep.id} endpoint={ep} />
        ))}
      </div>

      {/* Health chart */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Health Over Time</h2>
          <div className="flex gap-2">
            {["24h", "7d", "30d"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx(
                  "rounded px-3 py-1 text-sm",
                  period === p
                    ? "bg-brand-border text-brand-text"
                    : "text-brand-muted hover:text-brand-text"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <HealthChart snapshots={analytics?.snapshots ?? modelData.snapshots_24h} />
      </div>

      {/* Breakdowns */}
      {analytics && (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* By harness */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-brand-subtitle">
              By Harness
            </h3>
            <div className="rounded-lg border border-brand-border bg-brand-card p-4">
              {Object.entries(analytics.by_harness).length === 0 ? (
                <span className="text-sm text-brand-muted">No data</span>
              ) : (
                Object.entries(analytics.by_harness)
                  .sort(([, a], [, b]) => b - a)
                  .map(([harness, count]) => (
                    <div
                      key={harness}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{harness}</span>
                      <span className="text-sm text-brand-muted">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* By region */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-brand-subtitle">
              By Region
            </h3>
            <div className="rounded-lg border border-brand-border bg-brand-card p-4">
              {Object.entries(analytics.by_region).length === 0 ? (
                <span className="text-sm text-brand-muted">No data</span>
              ) : (
                Object.entries(analytics.by_region)
                  .sort(([, a], [, b]) => b - a)
                  .map(([region, count]) => (
                    <div
                      key={region}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{region}</span>
                      <span className="text-sm text-brand-muted">{count}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent reports */}
      <h2 className="mb-3 text-lg font-semibold">Recent Reports</h2>
      <ReportFeed reports={reports?.reports ?? []} />
    </div>
  );
}
