import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(
      { email, name: name || undefined },
      { onSuccess: () => navigate("/settings") }
    );
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        {register.isError && (
          <p className="text-sm text-health-red">
            {register.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={register.isPending}
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {register.isPending ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
