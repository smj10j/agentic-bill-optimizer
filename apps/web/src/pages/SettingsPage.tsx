/**
 * PRD-044: Settings & Configuration Hub
 * 6 sections: Autopilot, Accounts, Notifications, Profile, Intelligence, About
 */
import { useState, useEffect } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../store/auth.js";
import { getAutopilotSettings, updateAutopilotSettings, type AutopilotSettings } from "../lib/autopilot.js";
import { getNotificationPrefs, updateNotificationPrefs, getProfile, type NotificationPrefs, type Profile } from "../lib/settings.js";
import { getAccounts, disconnectAccount, getLinkToken, exchangeLinkToken } from "../lib/accounts.js";
import type { Account } from "@orbit/shared";

type Section = "autopilot" | "accounts" | "notifications" | "profile" | "intelligence" | "about";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "autopilot", label: "Autopilot", icon: "✈️" },
  { id: "accounts", label: "Accounts", icon: "🏦" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "profile", label: "Profile & Security", icon: "👤" },
  { id: "intelligence", label: "Intelligence", icon: "🧠" },
  { id: "about", label: "About", icon: "ℹ️" },
];

// ─── Autopilot Section ────────────────────────────────────────────────────────

function AutopilotSection() {
  const [settings, setSettings] = useState<AutopilotSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAutopilotSettings().then(setSettings).catch(() => {});
  }, []);

  async function update(patch: Partial<AutopilotSettings>) {
    if (!settings) return;
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await updateAutopilotSettings(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  const tiers: { value: 0 | 1 | 2 | 3; label: string; desc: string }[] = [
    { value: 0, label: "Just suggestions", desc: "I'll take all actions" },
    { value: 1, label: "Notify & Do", desc: "Act first, tell me right away" },
    { value: 2, label: "Supervised", desc: "Act within limits, daily digest" },
    { value: 3, label: "Full autopilot", desc: "Handle everything, weekly review" },
  ];

  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
          Settings saved
        </div>
      )}

      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
        <div>
          <p className="font-semibold text-gray-900">Autopilot</p>
          <p className="text-xs text-gray-500">Orbit handles routine actions within your limits</p>
        </div>
        <button
          onClick={() => void update({ enabled: !settings.enabled })}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? "bg-blue-600" : "bg-gray-300"}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.enabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      {/* Autonomy tier */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">How much should Orbit handle?</p>
        <div className="space-y-2">
          {tiers.map((tier) => (
            <button
              key={tier.value}
              onClick={() => void update({ tier: tier.value })}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                settings.tier === tier.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${settings.tier === tier.value ? "border-blue-500" : "border-gray-300"}`}>
                {settings.tier === tier.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{tier.label}</p>
                <p className="text-xs text-gray-500">{tier.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Spending limits */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-700">Spending limits</p>
        {[
          { label: "Daily limit", key: "dailyLimitCents" as const, min: 5000, max: 500000, step: 5000 },
          { label: "Single action limit", key: "singleActionLimitCents" as const, min: 2500, max: 200000, step: 2500 },
        ].map(({ label, key, min, max, step }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-sm font-bold text-gray-900">${((settings[key] as number) / 100).toLocaleString()}</p>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key] as number}
              onChange={(e) => void update({ [key]: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Accounts Section ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  healthy: { label: "Healthy", dot: "bg-green-500" },
  degraded: { label: "Degraded", dot: "bg-yellow-500" },
  error: { label: "Error", dot: "bg-red-500" },
  requires_reauth: { label: "Needs reauth", dot: "bg-orange-500" },
  disconnected: { label: "Disconnected", dot: "bg-gray-400" },
  manual: { label: "Manual", dot: "bg-blue-400" },
};

function AccountsSection() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [linking, setLinking] = useState(false);

  const load = () => getAccounts().then(setAccounts).catch(() => {});
  useEffect(() => { void load(); }, []);

  async function handleDisconnect(id: string) {
    await disconnectAccount(id);
    void load();
  }

  async function handleLink() {
    setLinking(true);
    try {
      const { linkToken } = await getLinkToken();
      await exchangeLinkToken(linkToken, "demo_bank", "Demo Bank");
      void load();
    } finally {
      setLinking(false);
    }
  }

  const active = accounts?.filter((a) => a.connectionStatus !== "disconnected") ?? [];
  const totalCents = active.reduce((s, a) => s + a.balanceCents, 0);

  return (
    <div className="space-y-4">
      {accounts !== null && active.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-blue-700">Total balance</p>
          <p className="font-bold text-blue-900">${(totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      )}

      {accounts === null && <div className="animate-pulse h-24 bg-gray-100 rounded-xl" />}

      <div className="space-y-3">
        {active.map((account) => {
          const cfg = STATUS_CONFIG[account.connectionStatus] ?? STATUS_CONFIG.manual;
          const icon = account.accountType === "checking" ? "🏦" : account.accountType === "savings" ? "💰" : "💳";
          return (
            <div key={account.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{account.name}</p>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{account.institution}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    ${Math.abs(account.balanceCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => void handleDisconnect(account.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <button
          onClick={handleLink}
          disabled={linking}
          className="w-full py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {linking ? "Connecting..." : "+ Add account"}
        </button>
      </div>
    </div>
  );
}

// ─── Notifications Section ────────────────────────────────────────────────────

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getNotificationPrefs().then(setPrefs).catch(() => {}); }, []);

  async function update(patch: Partial<NotificationPrefs>) {
    if (!prefs) return;
    const updated = { ...prefs, ...patch };
    setPrefs(updated);
    await updateNotificationPrefs(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!prefs) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  const categories = [
    { key: "agentActions" as const, label: "Agent actions", desc: "When Orbit takes or proposes an action" },
    { key: "billReminders" as const, label: "Bill reminders", desc: "Upcoming due dates and payments" },
    { key: "unusualCharges" as const, label: "Unusual charges", desc: "Duplicate charges, price increases" },
    { key: "insights" as const, label: "Insights & savings", desc: "Money-saving opportunities" },
    { key: "yieldUpdates" as const, label: "Yield updates", desc: "Earnings and rate changes" },
  ];

  return (
    <div className="space-y-5">
      {saved && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">Preferences saved</div>}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Alert categories</p>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {categories.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <button
                onClick={() => void update({ [key]: !prefs[key] })}
                className={`relative w-10 h-5 rounded-full transition-colors ${prefs[key] ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs[key] ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Quiet hours</p>
            <p className="text-xs text-gray-500">No push notifications during these hours</p>
          </div>
          <button
            onClick={() => void update({ quietHoursEnabled: !prefs.quietHoursEnabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${prefs.quietHoursEnabled ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs.quietHoursEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
        {prefs.quietHoursEnabled && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{prefs.quietHoursStart}:00</span>
            <span className="text-gray-400">to</span>
            <span>{prefs.quietHoursEnd}:00</span>
            <span className="text-xs text-gray-400">({prefs.timezone})</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { getProfile().then(setProfile).catch(() => {}); }, []);

  if (!profile) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  const memberSince = new Date(profile.createdAt * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
            <p className="text-sm font-medium text-gray-900">{profile.email}</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Member since</p>
          <p className="text-sm font-medium text-gray-900">{memberSince}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <p className="text-sm font-medium text-gray-900">Change password</p>
          <span className="text-gray-400">›</span>
        </button>
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">Two-factor auth</p>
            <p className="text-xs text-gray-400">Not enabled</p>
          </div>
          <span className="text-xs text-blue-600 font-medium">Enable</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <button onClick={logout} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <p className="text-sm font-medium text-gray-900">Sign out</p>
          <span className="text-gray-400">›</span>
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full p-4 text-left hover:bg-red-50 transition-colors"
        >
          <p className="text-sm font-medium text-red-600">Delete account</p>
          <p className="text-xs text-red-400">Permanently delete your data</p>
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700">Delete your account?</p>
          <p className="text-xs text-red-600 leading-relaxed">
            Your data will be permanently deleted within 30 days. All connected accounts will be unlinked. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white font-medium">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Intelligence Section ─────────────────────────────────────────────────────

function IntelligenceSection() {
  const [minImpact, setMinImpact] = useState(500); // $5
  const [tone, setTone] = useState<"concise" | "detailed" | "coaching">("concise");
  const [categories, setCategories] = useState({
    savings: true,
    risk: true,
    pattern: true,
    yield: true,
    benchmarks: false,
  });

  function toggleCat(key: keyof typeof categories) {
    setCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Insight categories</p>
        {[
          { key: "savings" as const, label: "Savings opportunities" },
          { key: "risk" as const, label: "Risk alerts" },
          { key: "pattern" as const, label: "Spending patterns" },
          { key: "yield" as const, label: "Yield opportunities" },
          { key: "benchmarks" as const, label: "Benchmark comparisons" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <p className="text-sm text-gray-700">{label}</p>
            <input type="checkbox" checked={categories[key]} onChange={() => toggleCat(key)} className="accent-blue-600 w-4 h-4" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900">Minimum dollar impact</p>
          <p className="text-sm font-bold text-gray-900">${(minImpact / 100).toFixed(0)}</p>
        </div>
        <p className="text-xs text-gray-400 mb-2">Only show insights worth at least this amount</p>
        <input
          type="range"
          min={100}
          max={10000}
          step={100}
          value={minImpact}
          onChange={(e) => setMinImpact(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-900">Agent tone</p>
        {[
          { value: "concise" as const, label: "Concise", desc: "Brief, direct answers" },
          { value: "detailed" as const, label: "Detailed", desc: "Full explanations" },
          { value: "coaching" as const, label: "Coaching", desc: "Teach me as we go" },
        ].map(({ value, label, desc }) => (
          <button
            key={value}
            onClick={() => setTone(value)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
              tone === value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${tone === value ? "border-blue-500" : "border-gray-300"}`}>
              {tone === value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">{label}</span>
              <span className="text-xs text-gray-500 ml-2">— {desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── About Section ────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-2">
          <span className="text-white font-bold text-lg">O</span>
        </div>
        <p className="font-bold text-gray-900">Orbit</p>
        <p className="text-xs text-gray-400">v0.1.0 · © 2026 Orbit</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {["Privacy Policy", "Terms of Service", "Security", "Open source credits", "Send feedback"].map((item) => (
          <button key={item} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <p className="text-sm text-gray-700">{item}</p>
            <span className="text-gray-400">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<Section, () => JSX.Element> = {
  autopilot: AutopilotSection,
  accounts: AccountsSection,
  notifications: NotificationsSection,
  profile: ProfileSection,
  intelligence: IntelligenceSection,
  about: AboutSection,
};

export default function SettingsPage() {
  const router = useRouterState();
  const navigate = useNavigate();

  // Derive active section from URL hash or default to autopilot
  const hash = router.location.hash.replace("#", "") as Section;
  const activeSection: Section = SECTIONS.find((s) => s.id === hash)?.id ?? "autopilot";

  function setSection(id: Section) {
    void navigate({ to: "/settings", hash: id });
  }

  const ActiveComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure Orbit to work the way you want</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col w-48 shrink-0 gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                activeSection === s.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="text-base">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden w-full mb-4">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {SECTIONS.find((s) => s.id === activeSection)?.label}
          </h2>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
