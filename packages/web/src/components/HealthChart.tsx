import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HealthSnapshot } from "@weatheragency/shared";

interface HealthChartProps {
  snapshots: HealthSnapshot[];
}

export function HealthChart({ snapshots }: HealthChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-brand-border bg-brand-card text-brand-muted">
        No data yet
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    time: new Date(s.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    availability: Math.round(s.availability_score),
    quality: Math.round(s.quality_score),
    overall: Math.round(s.score),
  }));

  return (
    <div className="h-64 rounded-lg border border-brand-border bg-brand-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
          <XAxis dataKey="time" stroke="#5a6a7a" fontSize={11} />
          <YAxis domain={[0, 100]} stroke="#5a6a7a" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2332",
              border: "1px solid #2a3a4a",
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="availability"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="Availability"
          />
          <Line
            type="monotone"
            dataKey="quality"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
            name="Quality"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
