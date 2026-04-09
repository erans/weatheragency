import { useState } from "react";
import { api } from "../api/client";

export function Suggest() {
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [hostingProvider, setHostingProvider] = useState("");
  const [hostingLabel, setHostingLabel] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.suggestModel({
        provider,
        name,
        hosting_provider: hostingProvider || undefined,
        hosting_label: hostingLabel || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Suggestion Submitted</h1>
        <p className="text-brand-subtitle">
          Your suggestion is pending review. It may take a while to get
          approved. Thank you for helping expand our catalog!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">Suggest a Model</h1>
      <p className="mb-6 text-sm text-brand-subtitle">
        Don't see a model or endpoint you use? Suggest it here.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Provider *
          </label>
          <input
            type="text"
            required
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. mistral, cohere"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Model Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mistral Large 2"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Hosting Provider (optional)
          </label>
          <input
            type="text"
            value={hostingProvider}
            onChange={(e) => setHostingProvider(e.target.value)}
            placeholder="e.g. together, fireworks"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-brand-subtitle">
            Hosting Label (optional)
          </label>
          <input
            type="text"
            value={hostingLabel}
            onChange={(e) => setHostingLabel(e.target.value)}
            placeholder="e.g. Together AI"
            className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text outline-none focus:border-brand-subtitle"
          />
        </div>
        {error && <p className="text-sm text-health-red">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-health-green px-4 py-2 font-medium text-brand-bg transition-opacity hover:opacity-90"
        >
          Submit Suggestion
        </button>
      </form>
    </div>
  );
}
