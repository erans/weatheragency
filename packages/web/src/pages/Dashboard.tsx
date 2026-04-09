import { useStatus } from "../hooks/useStatus";
import { useReports } from "../hooks/useReports";
import { ModelCard } from "../components/ModelCard";
import { ReportFeed } from "../components/ReportFeed";

export function Dashboard() {
  const { data: status, isLoading: statusLoading } = useStatus();
  const { data: reports, isLoading: reportsLoading } = useReports({
    limit: 20,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">AI Model Status</h1>

      {statusLoading ? (
        <div className="text-brand-muted">Loading...</div>
      ) : (
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {status?.models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold">Live Feed</h2>

      {reportsLoading ? (
        <div className="text-brand-muted">Loading...</div>
      ) : (
        <ReportFeed reports={reports?.reports ?? []} />
      )}
    </div>
  );
}
