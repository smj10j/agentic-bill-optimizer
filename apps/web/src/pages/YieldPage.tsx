import { useState, FormEvent } from "react";
import { formatCents, formatApyBasisPoints } from "@orbit/shared";
import MoneyAmount from "../components/MoneyAmount";

const APY_BASIS_POINTS = 450;
const INITIAL_BALANCE_CENTS = 120000;
const TOTAL_EARNED_CENTS = 4823;

export default function YieldPage() {
  const [balanceCents, setBalanceCents] = useState(INITIAL_BALANCE_CENTS);
  const [sweepInAmount, setSweepInAmount] = useState("");
  const [sweepOutAmount, setSweepOutAmount] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  function handleSweepIn(e: FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(sweepInAmount);
    if (isNaN(dollars) || dollars <= 0) {
      showMessage("Enter a valid amount.", "error");
      return;
    }
    const cents = Math.round(dollars * 100);
    setBalanceCents((prev) => prev + cents);
    setSweepInAmount("");
    showMessage(`Swept in ${formatCents(cents)} successfully.`, "success");
  }

  function handleSweepOut(e: FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(sweepOutAmount);
    if (isNaN(dollars) || dollars <= 0) {
      showMessage("Enter a valid amount.", "error");
      return;
    }
    const cents = Math.round(dollars * 100);
    if (cents > balanceCents) {
      showMessage("Insufficient yield balance.", "error");
      return;
    }
    setBalanceCents((prev) => prev - cents);
    setSweepOutAmount("");
    showMessage(`Swept out ${formatCents(cents)} successfully.`, "success");
  }

  const monthlyEarningsCents = Math.floor((balanceCents * (APY_BASIS_POINTS / 10000)) / 12);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Yield</h2>
        <p className="text-sm text-gray-500 mt-0.5">Put your idle cash to work.</p>
      </div>

      {/* Toast message */}
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* APY hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white text-center">
        <p className="text-blue-200 text-sm font-medium mb-1">Current APY</p>
        <p className="text-6xl font-bold tracking-tight">
          {formatApyBasisPoints(APY_BASIS_POINTS)}
        </p>
        <p className="text-blue-200 text-sm mt-2">Variable rate, updated daily</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Balance</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCents(balanceCents)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Est. monthly</p>
          <MoneyAmount cents={monthlyEarningsCents} className="text-lg font-bold mt-1 block" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Total earned</p>
          <MoneyAmount cents={TOTAL_EARNED_CENTS} className="text-lg font-bold mt-1 block" />
        </div>
      </div>

      {/* Sweep controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sweep In */}
        <form
          onSubmit={handleSweepIn}
          className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Sweep In</h3>
            <p className="text-xs text-gray-400 mt-0.5">Move money into yield</p>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={sweepInAmount}
              onChange={(e) => setSweepInAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white text-sm font-medium rounded-lg py-2.5 hover:bg-blue-700 transition-colors"
          >
            Sweep In
          </button>
        </form>

        {/* Sweep Out */}
        <form
          onSubmit={handleSweepOut}
          className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Sweep Out</h3>
            <p className="text-xs text-gray-400 mt-0.5">Withdraw from yield</p>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={sweepOutAmount}
              onChange={(e) => setSweepOutAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full border border-gray-300 text-gray-700 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
          >
            Sweep Out
          </button>
        </form>
      </div>
    </div>
  );
}
