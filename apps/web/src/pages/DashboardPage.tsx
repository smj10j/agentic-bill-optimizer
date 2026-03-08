import { formatCents, formatApyBasisPoints } from "@orbit/shared";
import MoneyAmount from "../components/MoneyAmount";
import { useAuth } from "../store/auth";

const MOCK_BILLS = [
  { id: "1", name: "Electricity", amountCents: 8700, dueAt: Date.now() + 2 * 24 * 60 * 60 * 1000 },
  { id: "2", name: "Internet", amountCents: 5999, dueAt: Date.now() + 7 * 24 * 60 * 60 * 1000 },
  { id: "3", name: "Water", amountCents: 4200, dueAt: Date.now() + 14 * 24 * 60 * 60 * 1000 },
];

function daysUntil(ts: number): number {
  return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

function billUrgencyClass(ts: number): string {
  const days = daysUntil(ts);
  if (days <= 3) return "text-red-600";
  if (days <= 7) return "text-yellow-600";
  return "text-green-600";
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {user ? `Hi, ${user.email.split("@")[0]}` : "Dashboard"}
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Here's what's happening with your money.</p>
      </div>

      {/* Net balance card */}
      <div className="bg-blue-600 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm font-medium">Net balance</p>
        <p className="text-4xl font-bold mt-1">{formatCents(425000)}</p>
        <p className="text-blue-200 text-xs mt-2">Across all accounts</p>
      </div>

      {/* Yield card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Earning yield</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {formatApyBasisPoints(450)} APY
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            on{" "}
            <span className="font-medium text-gray-800">{formatCents(120000)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Est. monthly</p>
          <MoneyAmount
            cents={450}
            className="text-lg font-semibold"
          />
        </div>
      </div>

      {/* Upcoming bills */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Upcoming bills</h3>
        <ul className="space-y-3">
          {MOCK_BILLS.map((bill) => {
            const days = daysUntil(bill.dueAt);
            return (
              <li key={bill.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{bill.name}</p>
                  <p className={`text-xs mt-0.5 ${billUrgencyClass(bill.dueAt)}`}>
                    Due in {days} day{days !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {formatCents(bill.amountCents)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Orbit insight */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">🤖</span>
          <div>
            <p className="text-sm font-semibold text-purple-800">Orbit says…</p>
            <p className="text-sm text-purple-700 mt-1 leading-relaxed">
              You have $3,050 sitting in your checking account earning nothing. Sweeping
              $2,000 into your yield account would earn an extra $7.50/month at current rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
