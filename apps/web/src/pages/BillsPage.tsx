import { useState } from "react";
import { formatCents } from "@orbit/shared";
import StatusBadge from "../components/StatusBadge";
import type { BillStatus } from "@orbit/shared";

type MockBill = {
  id: string;
  name: string;
  amountCents: number;
  dueAt: number;
  status: BillStatus;
};

const INITIAL_BILLS: MockBill[] = [
  {
    id: "1",
    name: "Electricity",
    amountCents: 8700,
    dueAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
    status: "pending",
  },
  {
    id: "2",
    name: "Internet",
    amountCents: 5999,
    dueAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    status: "pending",
  },
  {
    id: "3",
    name: "Water",
    amountCents: 4200,
    dueAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    status: "pending",
  },
  {
    id: "4",
    name: "Rent",
    amountCents: 220000,
    dueAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    status: "overdue",
  },
  {
    id: "5",
    name: "Phone",
    amountCents: 4500,
    dueAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    status: "paid",
  },
];

function daysLabel(dueAt: number, status: BillStatus): { text: string; colorClass: string } {
  if (status === "paid") return { text: "Paid", colorClass: "text-green-600" };
  const days = Math.ceil((dueAt - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, colorClass: "text-red-600" };
  if (days === 0) return { text: "Due today", colorClass: "text-red-600" };
  if (days <= 3) return { text: `Due in ${days}d`, colorClass: "text-red-500" };
  if (days <= 7) return { text: `Due in ${days}d`, colorClass: "text-yellow-600" };
  return { text: `Due in ${days}d`, colorClass: "text-green-600" };
}

export default function BillsPage() {
  const [bills, setBills] = useState<MockBill[]>(INITIAL_BILLS);

  function payBill(id: string) {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "paid" as BillStatus } : b))
    );
  }

  const pending = bills.filter((b) => b.status !== "paid");
  const paid = bills.filter((b) => b.status === "paid");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bills</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {pending.length} bill{pending.length !== 1 ? "s" : ""} pending
        </p>
      </div>

      {/* Pending / overdue */}
      {pending.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Upcoming &amp; overdue
          </h3>
          <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {pending.map((bill) => {
              const label = daysLabel(bill.dueAt, bill.status);
              return (
                <li key={bill.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">{bill.name}</p>
                      <StatusBadge status={bill.status} />
                    </div>
                    <p className={`text-xs mt-0.5 ${label.colorClass}`}>{label.text}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-sm font-semibold text-gray-800">
                      {formatCents(bill.amountCents)}
                    </span>
                    <button
                      onClick={() => payBill(bill.id)}
                      className="bg-blue-600 text-white text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors"
                    >
                      Pay
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Paid
          </h3>
          <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {paid.map((bill) => (
              <li key={bill.id} className="flex items-center justify-between px-5 py-4 opacity-60">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-700">{bill.name}</p>
                    <StatusBadge status={bill.status} />
                  </div>
                </div>
                <span className="text-sm text-gray-600">{formatCents(bill.amountCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
