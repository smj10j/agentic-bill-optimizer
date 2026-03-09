import { useState, useEffect, useCallback } from "react";
import { getInsights, recordInsightFeedback, markInsightViewed, runInsightDetection, type InsightRecord } from "../lib/insights.js";

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  savings: { icon: "💰", color: "text-green-700 bg-green-50 border-green-200" },
  risk: { icon: "⚠️", color: "text-red-700 bg-red-50 border-red-200" },
  pattern: { icon: "📊", color: "text-blue-700 bg-blue-50 border-blue-200" },
  yield: { icon: "📈", color: "text-purple-700 bg-purple-50 border-purple-200" },
};

function InsightCard({ insight, onUpdate }: { insight: InsightRecord; onUpdate: () => void }) {
  const [acted, setActed] = useState(false);
  const cfg = CATEGORY_CONFIG[insight.category] ?? CATEGORY_CONFIG.savings;

  useEffect(() => {
    if (insight.status === "new") {
      void markInsightViewed(insight.id);
    }
  }, [insight.id, insight.status]);

  async function handleFeedback(feedback: "helpful" | "not_helpful" | "acted" | "dismissed") {
    if (feedback === "acted") setActed(true);
    await recordInsightFeedback(insight.id, feedback);
    if (feedback === "dismissed" || feedback === "not_helpful") onUpdate();
  }

  const impactStr = insight.dollarImpactCents
    ? `$${(insight.dollarImpactCents / 100).toFixed(0)}/yr potential`
    : null;

  return (
    <div className={`bg-white rounded-xl border p-4 ${cfg.color.split(" ").slice(2).join(" ")}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg.color.split(" ").slice(0, 2).join(" ")}`}>
              {insight.category}
            </span>
            {impactStr && (
              <span className="text-xs font-semibold text-gray-700">{impactStr}</span>
            )}
            {insight.status === "new" && (
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{insight.body}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!acted ? (
            <>
              <button
                onClick={() => void handleFeedback("helpful")}
                className="text-xs text-gray-400 hover:text-green-600 transition-colors p-1"
                title="Helpful"
              >👍</button>
              <button
                onClick={() => void handleFeedback("not_helpful")}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors p-1"
                title="Not helpful"
              >👎</button>
            </>
          ) : (
            <span className="text-xs text-green-600 font-medium">Marked as acted</span>
          )}
        </div>
        <button
          onClick={() => void handleFeedback("dismissed")}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getInsights();
      setInsights(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insights");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleRun() {
    setRunning(true);
    try {
      await runInsightDetection();
      await load();
    } finally {
      setRunning(false);
    }
  }

  const byCategory = insights
    ? Object.entries(
        insights.reduce<Record<string, InsightRecord[]>>((acc, ins) => {
          if (!acc[ins.category]) acc[ins.category] = [];
          acc[ins.category].push(ins);
          return acc;
        }, {})
      ).sort(([a], [b]) => {
        const order = ["risk", "savings", "yield", "pattern"];
        return order.indexOf(a) - order.indexOf(b);
      })
    : [];

  const totalImpact = insights
    ? insights.reduce((s, i) => s + (i.dollarImpactCents ?? 0), 0)
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Insights</h1>
          <p className="text-sm text-gray-500">What Orbit found while watching your finances</p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
        >
          {running ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : "↻"} Scan
        </button>
      </div>

      {insights !== null && totalImpact > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-80">Total potential savings found</p>
          <p className="text-2xl font-bold">${(totalImpact / 100).toFixed(0)}<span className="text-sm font-normal opacity-80">/yr</span></p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={load} className="text-sm text-red-700 underline">Retry</button>
        </div>
      )}

      {insights === null && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {insights !== null && insights.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-gray-700 font-medium">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No active insights. Orbit will keep watching.</p>
          <button onClick={handleRun} disabled={running} className="mt-4 text-sm text-blue-600 hover:underline disabled:opacity-50">
            Run a fresh scan
          </button>
        </div>
      )}

      {byCategory.map(([category, categoryInsights]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CATEGORY_CONFIG[category]?.icon}</span>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide capitalize">{category}</h2>
            <span className="text-xs text-gray-400">({categoryInsights.length})</span>
          </div>
          {categoryInsights.map((ins) => (
            <InsightCard key={ins.id} insight={ins} onUpdate={load} />
          ))}
        </div>
      ))}
    </div>
  );
}
