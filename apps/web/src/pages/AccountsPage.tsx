import { useState, useEffect, useCallback } from "react";
import type { Account } from "@orbit/shared";
import { getAccounts, getLinkToken, exchangeLinkToken, disconnectAccount } from "../lib/accounts.js";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  healthy: { label: "Connected", color: "text-green-700 bg-green-50", dot: "bg-green-500" },
  degraded: { label: "Degraded", color: "text-yellow-700 bg-yellow-50", dot: "bg-yellow-500" },
  error: { label: "Error", color: "text-red-700 bg-red-50", dot: "bg-red-500" },
  requires_reauth: { label: "Needs reauth", color: "text-orange-700 bg-orange-50", dot: "bg-orange-500" },
  disconnected: { label: "Disconnected", color: "text-gray-600 bg-gray-100", dot: "bg-gray-400" },
  manual: { label: "Manual", color: "text-blue-700 bg-blue-50", dot: "bg-blue-400" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.manual;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AccountCard({ account, onDisconnect }: { account: Account; onDisconnect: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeIcon = account.accountType === "checking" ? "🏦" : account.accountType === "savings" ? "💰" : "💳";
  const balance = `$${(account.balanceCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      await disconnectAccount(account.id);
      onDisconnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (account.connectionStatus === "disconnected") return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{typeIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{account.name}</p>
            <StatusPill status={account.connectionStatus} />
          </div>
          <p className="text-xs text-gray-500">{account.institution}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{balance}</p>
          <p className="text-xs text-gray-400 capitalize">{account.accountType}</p>
        </div>
      </div>

      {account.connectionStatus === "requires_reauth" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-orange-700 mb-2">Reconnection required to continue syncing.</p>
          <button className="text-sm text-orange-700 font-medium underline">Reconnect</button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {!confirming ? (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-600">Remove this account?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkFlow({ onLinked }: { onLinked: () => void }) {
  const [step, setStep] = useState<"idle" | "loading" | "form" | "linking">("idle");
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  async function startLink() {
    setStep("loading");
    setError(null);
    try {
      const { linkToken: token } = await getLinkToken();
      setLinkToken(token);
      setStep("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start link flow");
      setStep("idle");
    }
  }

  async function simulateExchange() {
    if (!linkToken) return;
    setStep("linking");
    setError(null);
    try {
      await exchangeLinkToken(linkToken, "demo_bank", "Demo Bank");
      onLinked();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link accounts");
      setStep("form");
    }
  }

  if (step === "idle") {
    return (
      <button
        onClick={startLink}
        className="w-full py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium"
      >
        + Connect a bank account
      </button>
    );
  }

  if (step === "loading") {
    return (
      <div className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-center text-sm text-gray-400 animate-pulse">
        Preparing link...
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Connect Bank</p>
          <button onClick={() => setStep("idle")} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500">
          In production this opens Plaid Link. For the demo, click below to link a mock account.
        </p>
        <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-400 font-mono break-all">
          token: {linkToken}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={simulateExchange}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Link Demo Bank accounts
        </button>
      </div>
    );
  }

  return (
    <div className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-center text-sm text-gray-400 animate-pulse">
      Linking accounts...
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = accounts?.filter((a) => a.connectionStatus !== "disconnected") ?? [];
  const totalCents = active.reduce((s, a) => s + a.balanceCents, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Accounts</h1>
        <p className="text-sm text-gray-500">Manage your connected financial accounts</p>
      </div>

      {accounts !== null && active.length > 0 && (
        <div className="bg-blue-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-80">Total balance</p>
          <p className="text-2xl font-bold">
            ${(totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs opacity-60 mt-1">{active.length} account{active.length !== 1 ? "s" : ""} connected</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={load} className="text-sm text-red-700 underline">Retry</button>
        </div>
      )}

      {accounts === null && !error && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-5 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {accounts !== null && (
        <div className="space-y-3">
          {active.map((account) => (
            <AccountCard key={account.id} account={account} onDisconnect={load} />
          ))}
          <LinkFlow onLinked={load} />
        </div>
      )}
    </div>
  );
}
