import { useState } from "react";
import { Link } from "react-router";
import { Turnstile } from "@marsidev/react-turnstile";
import { useAuth } from "../hooks/useAuth";

export function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { requestMagicLink } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    requestMagicLink.mutate({ email, name: name || undefined, turnstileToken });
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
      <h1 className="mb-6 text-2xl font-bold">Create Account</h1>
      <p className="mb-4 text-sm text-brand-subtitle">
        Register with your email and name. We'll send you a magic link to verify.
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
          <label className="mb-1 block text-sm text-brand-subtitle">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <Turnstile
          siteKey="0x4AAAAAAC23QMaJK6UrtOOG"
          onSuccess={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
        />
        {requestMagicLink.isError && (
          <p className="text-sm text-health-red">{requestMagicLink.error.message}</p>
        )}
        <button
          type="submit"
          disabled={requestMagicLink.isPending || !turnstileToken}
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {requestMagicLink.isPending ? "Sending..." : "Create Account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-brand-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-brand-text underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
