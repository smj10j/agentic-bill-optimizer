import { useState } from "react";
import { formatCents } from "@orbit/shared";
import StatusBadge from "../components/StatusBadge";
import type { Subscription, SubscriptionStatus } from "@orbit/shared";

type MockSubscription = Omit<Subscription, "userId" | "lastChargedAt" | "lastUsedAt" | "createdAt">;

const INITIAL_SUBS: MockSubscription[] = [
  {
    id: "1",
    merchantName: "Streaming Service",
    amountCents: 1599,
    billingCycle: "monthly",
    nextExpectedAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
    status: "active",
  },
  {
    id: "2",
    merchantName: "Cloud Storage",
    amountCents: 299,
    billingCycle: "monthly",
    nextExpectedAt: Date.now() + 12 * 24 * 60 * 60 * 1000,
    status: "active",
  },
  {
    id: "3",
    merchantName: "Music App",
    amountCents: 999,
    billingCycle: "monthly",
    nextExpectedAt: Date.now() + 20 * 24 * 60 * 60 * 1000,
    status: "flagged",
  },
  {
    id: "4",
    merchantName: "Fitness App",
    amountCents: 14999,
    billingCycle: "annual",
    nextExpectedAt: Date.now() + 180 * 24 * 60 * 60 * 1000,
    status: "active",
  },
  {
    id: "5",
    merchantName: "News Subscription",
    amountCents: 799,
    billingCycle: "monthly",
    nextExpectedAt: null,
    status: "cancelled",
  },
];

const CYCLE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<MockSubscription[]>(INITIAL_SUBS);

  function cancelSub(id: string) {
    setSubs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "cancelled" as SubscriptionStatus } : s))
    );
  }

  const active = subs.filter((s) => s.status !== "cancelled");
  const cancelled = subs.filter((s) => s.status === "cancelled");

  const totalMonthly = active
    .filter((s) => s.billingCycle === "monthly")
    .reduce((sum, s) => sum + s.amountCents, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {active.length} active &middot; {formatCents(totalMonthly)}/mo recurring
        </p>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Active
          </h3>
          <ul className="space-y-3">
            {active.map((sub) => (
              <li
                key={sub.id}
                className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{sub.merchantName}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CYCLE_LABELS[sub.billingCycle]}
                    {sub.nextExpectedAt
                      ? ` · Next: ${new Date(sub.nextExpectedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      {formatCents(sub.amountCents)}
                    </p>
                    <p className="text-xs text-gray-400">/{sub.billingCycle}</p>
                  </div>
                  {sub.status !== "cancelled" && (
                    <button
                      onClick={() => cancelSub(sub.id)}
                      className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Cancelled
          </h3>
          <ul className="space-y-2">
            {cancelled.map((sub) => (
              <li
                key={sub.id}
                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between opacity-60"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-600">{sub.merchantName}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{CYCLE_LABELS[sub.billingCycle]}</p>
                </div>
                <p className="text-sm text-gray-500">{formatCents(sub.amountCents)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
