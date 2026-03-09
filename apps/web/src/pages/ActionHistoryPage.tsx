import { useState, useEffect, useCallback } from "react";
import { getActions, undoAction, type AgentActionRecord } from "../lib/actions.js";

function riskColor(level: string) {
  if (level === "high") return "text-red-600 bg-red-50";
  if (level === "medium") return "text-orange-600 bg-orange-50";
  return "text-green-600 bg-green-50";
}

function statusBadge(status: string, approvalStatus: string) {
  if (status === "reversed") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Reversed</span>;
  if (approvalStatus === "pending") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Awaiting approval</span>;
  if (approvalStatus === "rejected") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>;
  if (status === "completed") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Pending</span>;
}

function UndoCountdown({ seconds, onUndo }: { seconds: number; onUndo: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <button
      onClick={onUndo}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium transition-colors"
    >
      <span>↩ Undo</span>
      <span className="text-xs opacity-75">({label})</span>
    </button>
  );
}

function ActionCard({ action, onUndone }: { action: AgentActionRecord; onUndone: () => void }) {
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUndo() {
    setUndoing(true);
    setError(null);
    try {
      await undoAction(action.id);
      onUndone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to undo");
      setUndoing(false);
    }
  }

  const date = new Date(action.createdAt * 1000);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {statusBadge(action.status, action.approvalStatus)}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColor(action.riskLevel)}`}>
              {action.riskLevel} risk
            </span>
            <span className="text-xs text-gray-400 font-mono">{action.actionType}</span>
          </div>
          <p className="text-sm font-medium text-gray-900">{action.description}</p>
          {action.amountCents > 0 && (
            <p className="text-sm text-gray-600 mt-0.5">${(action.amountCents / 100).toFixed(2)}</p>
          )}
          {action.reasoning && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{action.reasoning}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">{dateStr}</p>
          <p className="text-xs text-gray-400">{timeStr}</p>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {action.canUndo && !undoing && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <UndoCountdown seconds={action.undoSecondsRemaining} onUndo={handleUndo} />
        </div>
      )}
      {undoing && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">Reversing action...</p>
        </div>
      )}
    </div>
  );
}

export default function ActionHistoryPage() {
  const [actions, setActions] = useState<AgentActionRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getActions();
      setActions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load actions");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendingCount = actions?.filter((a) => a.approvalStatus === "pending").length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Action History</h1>
          <p className="text-sm text-gray-500">Everything Orbit has done on your behalf</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={load} className="text-sm text-red-700 underline">Retry</button>
        </div>
      )}

      {actions === null && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {actions !== null && actions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No actions yet. Orbit will log everything it does here.</p>
        </div>
      )}

      {actions !== null && actions.length > 0 && (
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} onUndone={load} />
          ))}
        </div>
      )}
    </div>
  );
}
