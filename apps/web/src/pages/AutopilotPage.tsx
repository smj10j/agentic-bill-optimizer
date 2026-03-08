import { useState, useEffect, useCallback } from "react";
import {
  getAutopilotSettings,
  updateAutopilotSettings,
  getTrustScore,
  getPendingActions,
  approveAction,
  rejectAction,
  type AutopilotSettings,
  type AutopilotTier,
  type TrustScore,
  type PendingAction,
} from "../lib/autopilot";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDollars(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString();
}

// ─── Tier config ─────────────────────────────────────────────────────────────

type TierInfo = {
  tier: AutopilotTier;
  name: string;
  description: string;
  note?: string;
};

const TIERS: TierInfo[] = [
  {
    tier: 0,
    name: "Just suggestions",
    description: "I'll review and take all actions myself.",
  },
  {
    tier: 1,
    name: "Notify & Do",
    description: "Act first, notify me right away. I can undo anytime.",
  },
  {
    tier: 2,
    name: "Supervised",
    description: "Handle routine stuff within my limits. Daily digest.",
  },
  {
    tier: 3,
    name: "Full Autopilot",
    description: "Handle everything within my limits. Weekly summary.",
    note: "Requires 30 days + high trust score",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierCard({
  info,
  selected,
  onSelect,
}: {
  info: TierInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
            selected ? "border-blue-500" : "border-gray-300"
          }`}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        <div>
          <p className={`text-sm font-semibold ${selected ? "text-blue-800" : "text-gray-800"}`}>
            {info.name}
          </p>
          <p className={`text-xs mt-0.5 ${selected ? "text-blue-700" : "text-gray-500"}`}>
            {info.description}
          </p>
          {info.note && (
            <p className="text-xs mt-0.5 text-amber-600 font-medium">{info.note}</p>
          )}
        </div>
      </div>
    </button>
  );
}

function TrustScoreCard({ trustScore }: { trustScore: TrustScore }) {
  const hasActions = trustScore.totalActions > 0;
  const undoPct = hasActions
    ? Math.round(trustScore.undoRate * 100)
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Trust score</h3>
      {hasActions ? (
        <div className="space-y-1">
          <p className="text-lg font-bold text-gray-900">{trustScore.label}</p>
          <p className="text-sm text-gray-500">
            Based on {trustScore.totalActions} action
            {trustScore.totalActions !== 1 ? "s" : ""}, {undoPct}% undo rate
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 leading-relaxed">
          No actions yet — your trust score will build as Orbit handles things for you.
        </p>
      )}
    </div>
  );
}

function PendingActionRow({
  action,
  onApprove,
  onReject,
  loading,
}: {
  action: PendingAction;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{action.description}</p>
        <p className="text-xs text-gray-500 mt-0.5">{action.reasoning}</p>
        {action.amountCents > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">{formatDollars(action.amountCents)}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={loading}
          className="text-xs font-medium px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={loading}
          className="text-xs font-medium px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AutopilotPage() {
  const [settings, setSettings] = useState<AutopilotSettings | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Local editable state (mirrors settings once loaded)
  const [enabled, setEnabled] = useState(false);
  const [tier, setTier] = useState<AutopilotTier>(1);
  const [dailyLimitCents, setDailyLimitCents] = useState(100000);
  const [singleActionLimitCents, setSingleActionLimitCents] = useState(50000);
  const [requireApprovalSubscriptionCancel, setRequireApprovalSubscriptionCancel] = useState(true);

  function showToast(text: string, type: "success" | "error") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [s, ts, pa] = await Promise.allSettled([
        getAutopilotSettings(),
        getTrustScore(),
        getPendingActions(),
      ]);

      if (s.status === "rejected") {
        throw new Error(s.reason instanceof Error ? s.reason.message : "Failed to load settings");
      }

      const loaded = s.value;
      setSettings(loaded);
      setEnabled(loaded.enabled);
      setTier(loaded.tier);
      setDailyLimitCents(loaded.dailyLimitCents);
      setSingleActionLimitCents(loaded.singleActionLimitCents);
      setRequireApprovalSubscriptionCancel(loaded.requireApprovalSubscriptionCancel);

      if (ts.status === "fulfilled") setTrustScore(ts.value);
      if (pa.status === "fulfilled") setPendingActions(pa.value);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load autopilot settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateAutopilotSettings({
        enabled,
        tier,
        dailyLimitCents,
        singleActionLimitCents,
        requireApprovalSubscriptionCancel,
      });
      setSettings(updated);
      showToast("Settings saved", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleToggleEnabled() {
    if (enabled) {
      setConfirmDisable(true);
    } else {
      setEnabled(true);
    }
  }

  function handleConfirmDisable() {
    setEnabled(false);
    setConfirmDisable(false);
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await approveAction(id);
      setPendingActions((prev) => prev.filter((a) => a.id !== id));
      showToast("Action approved", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve action", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      await rejectAction(id);
      setPendingActions((prev) => prev.filter((a) => a.id !== id));
      showToast("Action rejected", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject action", "error");
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="h-8 bg-gray-200 rounded-lg w-40 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-3">
          <p className="text-sm text-red-700 font-medium">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="text-sm font-medium px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Autopilot</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Let Orbit handle the routine stuff within your limits.
          </p>
        </div>

        {/* Master toggle */}
        <div className="flex items-center gap-2 pt-1 shrink-0">
          <span className="text-sm text-gray-500">{enabled ? "On" : "Off"}</span>
          <button
            type="button"
            onClick={handleToggleEnabled}
            aria-pressed={enabled}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              enabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Confirm disable */}
      {confirmDisable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            Disable autopilot? Orbit will stop taking automatic actions.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmDisable}
              className="text-sm font-medium px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Disable
            </button>
            <button
              type="button"
              onClick={() => setConfirmDisable(false)}
              className="text-sm font-medium px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending approvals banner */}
      {pendingActions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">
            {pendingActions.length} action{pendingActions.length !== 1 ? "s" : ""} need
            {pendingActions.length === 1 ? "s" : ""} your approval
          </p>
          <div>
            {pendingActions.map((action) => (
              <PendingActionRow
                key={action.id}
                action={action}
                loading={actionLoading === action.id}
                onApprove={() => void handleApprove(action.id)}
                onReject={() => void handleReject(action.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 1: Tier selector */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          How much should Orbit handle?
        </h3>
        <div className="space-y-2">
          {TIERS.map((info) => (
            <TierCard
              key={info.tier}
              info={info}
              selected={tier === info.tier}
              onSelect={() => setTier(info.tier)}
            />
          ))}
        </div>
      </div>

      {/* Section 2: Spending limits */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">Spending limits</h3>

        {/* Daily limit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="daily-limit" className="text-sm text-gray-700">
              Daily limit
            </label>
            <span className="text-sm font-semibold text-gray-900">
              {formatDollars(dailyLimitCents)}
            </span>
          </div>
          <input
            id="daily-limit"
            type="range"
            min={0}
            max={500000}
            step={5000}
            value={dailyLimitCents}
            onChange={(e) => setDailyLimitCents(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>$0</span>
            <span>$5,000</span>
          </div>
        </div>

        {/* Single action limit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="single-action-limit" className="text-sm text-gray-700">
              Single action limit
            </label>
            <span className="text-sm font-semibold text-gray-900">
              {formatDollars(singleActionLimitCents)}
            </span>
          </div>
          <input
            id="single-action-limit"
            type="range"
            min={0}
            max={200000}
            step={2500}
            value={singleActionLimitCents}
            onChange={(e) => setSingleActionLimitCents(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>$0</span>
            <span>$2,000</span>
          </div>
        </div>
      </div>

      {/* Section 3: Always requires approval */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Always requires approval</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requireApprovalSubscriptionCancel}
            onChange={(e) => setRequireApprovalSubscriptionCancel(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600 cursor-pointer"
          />
          <span className="text-sm text-gray-700">
            Subscription cancellations — always ask before cancelling any subscription.
          </span>
        </label>
      </div>

      {/* Section 4: Trust score */}
      {trustScore && <TrustScoreCard trustScore={trustScore} />}

      {/* Save button */}
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full bg-blue-600 text-white text-sm font-semibold rounded-xl py-3 hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>

    </div>
  );
}
