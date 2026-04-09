import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Settings() {
  const { user, isLoggedIn, isLoading, regenerateToken, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const token = localStorage.getItem("wa_token") ?? "";

  if (isLoading) return <div className="text-brand-muted">Loading...</div>;
  if (!isLoggedIn) return <Navigate to="/login" />;

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="mb-6 rounded-lg border border-brand-border bg-brand-card p-4">
        <div className="mb-1 text-sm text-brand-subtitle">Signed in as</div>
        <div className="font-medium">{user?.email}</div>
        {user?.name && (
          <div className="text-sm text-brand-muted">{user.name}</div>
        )}
        <div className="mt-2 text-sm text-brand-muted">
          Trust score: {user?.trust_score}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">API Token</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 font-mono text-sm text-brand-text">
            {token}
          </code>
          <button
            onClick={copyToken}
            className="shrink-0 rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-subtitle hover:text-brand-text"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-sm text-brand-muted">
          Add this to your shell profile:
        </p>
        <code className="mt-1 block rounded-lg bg-brand-bg px-3 py-2 font-mono text-xs text-brand-subtitle">
          export WEATHER_AGENCY_TOKEN={token}
        </code>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            if (confirm("This will invalidate your current token. Continue?")) {
              regenerateToken.mutate();
            }
          }}
          className="rounded-lg border border-health-amber px-4 py-2 text-sm text-health-amber hover:bg-health-amber/10"
        >
          Regenerate Token
        </button>
        <button
          onClick={logout}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm text-brand-muted hover:text-brand-text"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
