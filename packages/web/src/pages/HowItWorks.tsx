export function HowItWorks() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">How It Works</h1>

      <div className="space-y-8 text-brand-subtitle leading-relaxed">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Community-Driven Status
          </h2>
          <p>
            Weather Agency aggregates reports from developers using AI models
            through their coding tools. When you report that a model is down,
            degraded, or producing poor output, it contributes to the overall
            health score visible to everyone.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Two Dimensions: Availability + Quality
          </h2>
          <p>
            Each report can include an <strong>availability</strong> rating
            (working / degraded / down) and a <strong>quality</strong> rating
            (good / poor / unusable). These are tracked independently — a model
            can be up but producing bad output, and we'll surface that.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Health Score (0–100)
          </h2>
          <p className="mb-3">
            Every 5 minutes, we compute a health score per model endpoint. The
            score is the <strong>worse</strong> of the availability and quality
            scores.
          </p>
          <div className="rounded-lg border border-brand-border bg-brand-card p-4 font-mono text-sm">
            <p>For each report in the last 30 minutes:</p>
            <p className="mt-1 ml-4">base = +1.0 (working/good), -0.5 (degraded/poor), -1.0 (down/unusable)</p>
            <p className="mt-1 ml-4">× trust multiplier (anonymous: 0.5, authenticated: 1.0–2.0)</p>
            <p className="mt-1 ml-4">× recency multiplier (0–5min: 1.0, 5–15min: 0.8, 15–30min: 0.5)</p>
            <p className="mt-3">score = normalized weighted average → 0–100</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Provider Status Integration
          </h2>
          <p>
            We also check official status pages (Anthropic, OpenAI, Google,
            AWS, etc.). If a provider reports an outage, we cap the availability
            score accordingly — even if user reports haven't caught up yet.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Trust & Weighting
          </h2>
          <p>
            Registered users' reports carry more weight than anonymous ones.
            This helps prevent spam and ensures the health scores reflect
            genuine experiences. Create a free account to increase your impact.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-brand-text">
            Reporting From Your Agent
          </h2>
          <p>
            Install the Weather Agency skill in your AI coding tool to report
            and check model status without leaving your workflow. The skill
            auto-detects your model, harness, and endpoint.
          </p>
        </section>
      </div>
    </div>
  );
}
