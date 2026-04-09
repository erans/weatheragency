import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const [token, setToken] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ token }, { onSuccess: () => navigate("/settings") });
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Log In</h1>
      <p className="mb-4 text-sm text-brand-subtitle">
        Enter your API token to log in. You can find it in your shell environment
        as <code className="rounded bg-brand-card px-1">WEATHER_AGENCY_TOKEN</code>.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            API Token
          </label>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="wa_..."
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 font-mono text-sm text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        {login.isError && (
          <p className="text-sm text-health-red">{login.error.message}</p>
        )}
        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {login.isPending ? "Logging in..." : "Log In"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-brand-muted">
        Don't have an account?{" "}
        <Link to="/register" className="text-brand-text underline">
          Register
        </Link>
      </p>
    </div>
  );
}
