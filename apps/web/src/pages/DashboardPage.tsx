import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { formatCents, formatApyBasisPoints } from "@orbit/shared";
import { useAuth } from "../store/auth";
import { getDashboardSummary, type DashboardSummary } from "../lib/dashboard";
import { approveAction, rejectAction } from "../lib/autopilot";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(ts: number): number {
  return Math.ceil((ts - Date.now() / 1000) / (60 * 60 * 24));
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(ts: number): string {
  const seconds = Math.floor(Date.now() / 1000 - ts);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const TIER_LABELS: Record<number, string> = {
  0: "Suggestions Only",
  1: "Notify & Do",
  2: "Supervised",
  3: "Full Autopilot",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}

// ─── Net Worth Bar ─────────────────────────────────────────────────────────────

function NetWorthBar({ data }: { data: DashboardSummary["balanceSummary"] }) {
  const isStale =
    data.lastSyncedAt !== null && Date.now() / 1000 - data.lastSyncedAt > 30 * 60;

  return (
    <div className="bg-blue-600 rounded-2xl p-5 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-blue-200 text-sm font-medium">Total available</p>
          <p className="text-4xl font-bold mt-1 tracking-tight">
            {formatCents(data.totalCents)}
          </p>
        </div>
        {isStale && (
          <span className="text-xs bg-blue-500 text-blue-100 px-2 py-0.5 rounded-full mt-1">
            Stale
          </span>
        )}
      </div>
      <div className="flex gap-4 mt-3 text-sm text-blue-200">
        <span>Checking {formatCents(data.checkingSavingsCents)}</span>
        <span>·</span>
        <span>Yield {formatCents(data.yieldCents)}</span>
      </div>
    </div>
  );
}

// ─── Action Required Cards ────────────────────────────────────────────────────

type ActionCardsProps = {
  pendingActions: DashboardSummary["pendingActions"];
  overdueBills: DashboardSummary["overdueBills"];
  onActionResolved: () => void;
};

function ActionRequiredCards({
  pendingActions,
  overdueBills,
  onActionResolved,
}: ActionCardsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await approveAction(id);
      onActionResolved();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectAction(id);
      onActionResolved();
    } finally {
      setBusyId(null);
    }
  }

  const hasPending = pendingActions.length > 0;
  const hasOverdue = overdueBills.length > 0;
  if (!hasPending && !hasOverdue) return null;

  return (
    <div className="space-y-2">
      {pendingActions.slice(0, 2).map((a) => (
        <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5">⏳</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Action needs your approval</p>
              <p className="text-sm text-amber-800 mt-0.5 truncate">{a.description}</p>
              {a.amountCents > 0 && (
                <p className="text-xs text-amber-700 mt-0.5">{formatCents(a.amountCents)}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleApprove(a.id)}
              disabled={busyId === a.id}
              className="flex-1 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(a.id)}
              disabled={busyId === a.id}
              className="flex-1 py-1.5 text-sm font-medium bg-white text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}

      {overdueBills.slice(0, 1).map((b) => {
        const daysOverdue = Math.abs(daysUntil(b.dueAt));
        return (
          <div key={b.id} className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">
                  {b.name} is {daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue
                </p>
                <p className="text-sm text-red-700 mt-0.5">{formatCents(b.amountCents)} due</p>
              </div>
              <Link
                to="/bills"
                className="text-xs font-medium text-red-700 hover:text-red-900 shrink-0"
              >
                View →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Autopilot Status Card ────────────────────────────────────────────────────

function AutopilotCard({ autopilot }: { autopilot: DashboardSummary["autopilot"] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none mt-0.5">🤖</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Autopilot:{" "}
              <span className={autopilot.enabled ? "text-green-600" : "text-gray-400"}>
                {autopilot.enabled ? "Active" : "Off"}
              </span>
            </p>
            {autopilot.enabled ? (
              <>
                <p className="text-xs text-gray-500 mt-0.5">{TIER_LABELS[autopilot.tier]}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {autopilot.actionsThisWeek} action
                  {autopilot.actionsThisWeek !== 1 ? "s" : ""} this week
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Turn on Autopilot to let Orbit handle the routine stuff
              </p>
            )}
          </div>
        </div>
        <Link
          to="/autopilot"
          className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
        >
          {autopilot.enabled ? "Edit →" : "Enable →"}
        </Link>
      </div>
    </div>
  );
}

// ─── Upcoming Bills ───────────────────────────────────────────────────────────

function UpcomingBills({ bills }: { bills: DashboardSummary["upcomingBills"] }) {
  if (bills.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Bills</h3>
        <p className="text-sm text-gray-400">No bills due in the next 7 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Upcoming Bills</h3>
        <Link to="/bills" className="text-xs text-blue-600 hover:text-blue-800">
          See all →
        </Link>
      </div>
      <ul className="space-y-3">
        {bills.map((bill) => {
          const days = daysUntil(bill.dueAt);
          const urgent = days <= 2;
          return (
            <li key={bill.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{bill.name}</p>
                <p
                  className={`text-xs mt-0.5 ${
                    urgent ? "text-red-600 font-medium" : "text-gray-400"
                  }`}
                >
                  {days === 0
                    ? "Due today"
                    : days === 1
                    ? "Due tomorrow"
                    : `Due ${formatDate(bill.dueAt)}`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-800">
                  {formatCents(bill.amountCents)}
                </span>
                {urgent && <p className="text-xs text-red-500 mt-0.5">Review</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Yield Snapshot ───────────────────────────────────────────────────────────

function YieldSnapshot({ snapshot }: { snapshot: DashboardSummary["yieldSnapshot"] }) {
  if (snapshot.balanceCents === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">💰</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">Yield</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Earn {formatApyBasisPoints(snapshot.apyBasisPoints)} APY on idle cash
              </p>
            </div>
          </div>
          <Link to="/yield" className="text-xs font-medium text-blue-600 hover:text-blue-800">
            Start earning →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none mt-0.5">💰</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Yield{" "}
              <span className="text-green-600">
                {formatApyBasisPoints(snapshot.apyBasisPoints)} APY
              </span>
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCents(snapshot.balanceCents)}
            </p>
            <div className="flex gap-3 mt-1 text-xs text-gray-500">
              <span>+{formatCents(snapshot.monthlyEarningCents)}/mo</span>
              <span>·</span>
              <span>+{formatCents(snapshot.weeklyEarningCents)}/wk</span>
            </div>
          </div>
        </div>
        <Link to="/yield" className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0">
          Manage →
        </Link>
      </div>
    </div>
  );
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

function RecentActivity({ activity }: { activity: DashboardSummary["recentActivity"] }) {
  if (activity.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h3>
        <p className="text-sm text-gray-400">
          No agent activity yet.{" "}
          <Link to="/agent" className="text-blue-600 hover:text-blue-800">
            Chat with Orbit →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
        <Link to="/agent" className="text-xs text-blue-600 hover:text-blue-800">
          Chat →
        </Link>
      </div>
      <ul className="space-y-3">
        {activity.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">
              {item.status === "reversed" ? "↩️" : "✅"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate">{item.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Flagged Subscriptions Banner ─────────────────────────────────────────────

function FlaggedBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">🔄</span>
          <p className="text-sm font-medium text-purple-900">
            {count} subscription{count !== 1 ? "s" : ""} flagged for review
          </p>
        </div>
        <Link
          to="/subscriptions"
          className="text-xs font-medium text-purple-700 hover:text-purple-900"
        >
          Review →
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = user?.email.split("@")[0] ?? "there";

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hi, {firstName}</h2>
          <p className="text-gray-500 text-sm mt-0.5">Here's your financial pulse.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="text-xl text-gray-400 hover:text-gray-600 transition-colors p-2"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* 1. Net Worth Bar */}
      <NetWorthBar data={summary.balanceSummary} />

      {/* 2. Action Required */}
      <ActionRequiredCards
        pendingActions={summary.pendingActions}
        overdueBills={summary.overdueBills}
        onActionResolved={() => void load()}
      />

      {/* 3. Flagged subscriptions */}
      <FlaggedBanner count={summary.flaggedSubscriptions.length} />

      {/* 4. Autopilot Status */}
      <AutopilotCard autopilot={summary.autopilot} />

      {/* 5. Upcoming Bills */}
      <UpcomingBills bills={summary.upcomingBills} />

      {/* 6. Yield Snapshot */}
      <YieldSnapshot snapshot={summary.yieldSnapshot} />

      {/* 7. Recent Activity */}
      <RecentActivity activity={summary.recentActivity} />
    </div>
  );
}
