import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { requestMagicLink } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestMagicLink.mutate({ email, name: name || undefined });
  };

  if (requestMagicLink.isSuccess) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Check your email</h1>
        <p className="mb-2 text-brand-subtitle">
          We sent a login link to <span className="font-medium text-brand-text">{email}</span>
        </p>
        <p className="text-sm text-brand-muted">
          The link expires in 15 minutes. Check your spam folder if you don't see it.
        </p>
        <button
          onClick={() => requestMagicLink.reset()}
          className="mt-6 text-sm text-brand-subtitle underline hover:text-brand-text"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Log In</h1>
      <p className="mb-4 text-sm text-brand-subtitle">
        Enter your email to receive a login link. No password needed.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">Email</label>
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
            Name <span className="text-brand-muted">(optional, for new accounts)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        {requestMagicLink.isError && (
          <p className="text-sm text-health-red">{requestMagicLink.error.message}</p>
        )}
        <button
          type="submit"
          disabled={requestMagicLink.isPending}
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {requestMagicLink.isPending ? "Sending..." : "Send Login Link"}
        </button>
      </form>
    </div>
  );
}
