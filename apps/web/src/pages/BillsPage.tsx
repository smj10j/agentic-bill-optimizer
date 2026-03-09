import { useEffect, useState, useCallback } from "react";
import { formatCents } from "@orbit/shared";
import { getBillSchedule, payBill, type SmartBill } from "../lib/bills";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysFromNow(ts: number): number {
  return Math.ceil((ts - Date.now() / 1000) / 86400);
}

// ─── Smart Pay Badge ──────────────────────────────────────────────────────────

function SmartPayBadge({ bill }: { bill: SmartBill }) {
  if (!bill.smartPayEnabled) {
    return <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">Manual</span>;
  }
  if (bill.smartPay.isAtRisk) {
    return <span className="text-xs text-red-700 px-2 py-0.5 rounded-full bg-red-100">Overdue</span>;
  }
  if (bill.smartPay.isUrgent) {
    return <span className="text-xs text-orange-700 px-2 py-0.5 rounded-full bg-orange-100">Pay soon</span>;
  }
  if (bill.smartPay.floatDays > 0) {
    return <span className="text-xs text-green-700 px-2 py-0.5 rounded-full bg-green-100">Smart ✓</span>;
  }
  return <span className="text-xs text-blue-700 px-2 py-0.5 rounded-full bg-blue-100">On track</span>;
}

// ─── Bill Row ─────────────────────────────────────────────────────────────────

function BillRow({ bill, onPaid }: { bill: SmartBill; onPaid: (id: string) => void }) {
  const [paying, setPaying] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handlePay() {
    setPaying(true);
    setRowError(null);
    try {
      await payBill(bill.id);
      onPaid(bill.id);
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  const daysUntilInitiate = daysFromNow(bill.smartPay.optimalInitiateDate);
  const daysUntilDue = daysFromNow(bill.dueAt);
  const urgentClass = bill.smartPay.isAtRisk
    ? "text-red-600 font-semibold"
    : bill.smartPay.isUrgent
    ? "text-orange-500"
    : "text-gray-500";

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800">{bill.name}</p>
            <SmartPayBadge bill={bill} />
          </div>

          <div className={`text-xs mt-1 ${urgentClass}`}>
            {bill.smartPay.isAtRisk ? (
              <span>Overdue — pay now</span>
            ) : bill.smartPayEnabled && bill.smartPay.floatDays > 0 ? (
              <span>
                Pay {daysUntilInitiate <= 0 ? "today" : `in ${daysUntilInitiate}d`}
                {" · "}due {formatDate(bill.dueAt)}
                {" · "}+{bill.smartPay.floatDays}d float
              </span>
            ) : (
              <span>
                {daysUntilDue <= 0
                  ? "Due today"
                  : daysUntilDue === 1
                  ? "Due tomorrow"
                  : `Due ${formatDate(bill.dueAt)}`}
              </span>
            )}
          </div>

          {bill.smartPay.yieldSavedCents > 0 && (
            <p className="text-xs text-green-600 mt-0.5">
              +{formatCents(bill.smartPay.yieldSavedCents)} yield by waiting
            </p>
          )}

          {rowError && <p className="text-xs text-red-500 mt-1">{rowError}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-gray-800">
            {formatCents(bill.amountCents)}
          </span>
          <button
            onClick={() => void handlePay()}
            disabled={paying}
            className="bg-blue-600 text-white text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {paying ? "..." : "Pay"}
          </button>
        </div>
      </div>
    </li>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ bills }: { bills: SmartBill[] }) {
  const totalPending = bills.reduce((s, b) => s + b.amountCents, 0);
  const totalYieldSaved = bills.reduce((s, b) => s + b.smartPay.yieldSavedCents, 0);
  const atRiskCount = bills.filter((b) => b.smartPay.isAtRisk).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">Total pending</p>
        <p className="text-xl font-bold text-gray-900">{formatCents(totalPending)}</p>
      </div>
      {totalYieldSaved > 0 && (
        <div className="text-right">
          <p className="text-xs text-gray-500">Yield captured</p>
          <p className="text-lg font-semibold text-green-600">+{formatCents(totalYieldSaved)}</p>
        </div>
      )}
      {atRiskCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <p className="text-xs font-semibold text-red-700">{atRiskCount} overdue</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillsPage() {
  const [bills, setBills] = useState<SmartBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setBills(await getBillSchedule());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handlePaid(id: string) {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="animate-pulse bg-gray-200 rounded h-8 w-32" />
        <div className="animate-pulse bg-gray-200 rounded-2xl h-20 w-full" />
        <div className="animate-pulse bg-gray-200 rounded-2xl h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const urgent = bills.filter((b) => b.smartPay.isAtRisk || b.smartPay.isUrgent);
  const upcoming = bills.filter((b) => !b.smartPay.isAtRisk && !b.smartPay.isUrgent);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bills</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {bills.length} bill{bills.length !== 1 ? "s" : ""} pending
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="text-xl text-gray-400 hover:text-gray-600 p-2"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No pending bills — you're all caught up!</p>
        </div>
      ) : (
        <>
          <SummaryBar bills={bills} />

          {urgent.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Needs attention
              </h3>
              <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {urgent.map((b) => <BillRow key={b.id} bill={b} onPaid={handlePaid} />)}
              </ul>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Upcoming · Smart pay active
              </h3>
              <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {upcoming.map((b) => <BillRow key={b.id} bill={b} onPaid={handlePaid} />)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
