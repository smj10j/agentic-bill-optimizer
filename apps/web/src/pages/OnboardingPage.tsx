/**
 * PRD-043: First-Run Experience & Demo Mode
 * 5-step onboarding flow for new real users.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../store/auth.js";
import { apiFetch } from "../lib/api.js";
import type { User } from "@orbit/shared";

type Step = "welcome" | "connect" | "insights" | "autopilot" | "notifications";

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["welcome", "connect", "insights", "autopilot", "notifications"];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className={`h-1.5 rounded-full transition-all ${i <= idx ? "w-6 bg-blue-600" : "w-1.5 bg-gray-200"}`} />
      ))}
    </div>
  );
}

function WelcomeStep({ onNext, onDemo }: { onNext: () => void; onDemo: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto">
        <span className="text-white text-2xl font-bold">O</span>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">Your money,<br />on autopilot.</h1>
        <p className="text-gray-500 mt-3 leading-relaxed">
          Orbit pays your bills at the right time, kills unused subscriptions,
          and makes your idle cash earn more.
        </p>
        <p className="text-sm text-gray-400 mt-2">Takes 2 minutes to set up.</p>
      </div>
      <div className="space-y-3">
        <button onClick={onNext} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 font-semibold transition-colors">
          Let's go →
        </button>
        <button onClick={onDemo} className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors">
          Show me first (Demo)
        </button>
      </div>
    </div>
  );
}

function ConnectStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);

  async function handleLink() {
    setLoading(true);
    // Simulate account linking (mock flow)
    await new Promise((r) => setTimeout(r, 2000));
    setLinked(true);
    setLoading(false);
    setTimeout(onNext, 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Connect your bank</h2>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          Connect your main checking account. Read-only access — we can never
          move money without your permission.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
        {[["🔒", "256-bit encrypted"], ["👁", "Read-only access"], ["🏦", "Bank-level security"]].map(([icon, label]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-2.5">
            <div className="text-xl mb-1">{icon}</div>
            <div>{label}</div>
          </div>
        ))}
      </div>

      {linked ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold">✓ Chase connected</p>
          <p className="text-green-600 text-sm mt-1">Importing 90 days of transactions...</p>
          <div className="mt-2 h-1 bg-green-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      ) : (
        <button
          onClick={handleLink}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </>
          ) : "Connect with Plaid"}
        </button>
      )}

      <button onClick={onSkip} className="w-full text-gray-400 text-sm py-1 hover:text-gray-600 transition-colors">
        I'll do this later
      </button>
    </div>
  );
}

function InsightStep({ onAction, onSkip }: { onAction: () => void; onSkip: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-blue-600">
        <span className="text-xl">🔍</span>
        <span className="text-sm font-semibold uppercase tracking-wide">We found something</span>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
        <p className="text-gray-900 text-lg font-semibold leading-snug">
          You're paying $47/month for Hulu that you haven't used in 6 weeks.
        </p>
        <p className="text-blue-700 text-2xl font-bold mt-2">$564 this year</p>
        <p className="text-gray-500 text-sm mt-1">for a service you're not using</p>
      </div>
      <div className="space-y-2">
        <button
          onClick={onAction}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors"
        >
          Cancel Hulu — save $47/mo
        </button>
        <button onClick={onSkip} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-medium transition-colors">
          Keep it, I use it
        </button>
        <button onClick={onSkip} className="w-full text-blue-600 text-sm py-1.5 hover:underline">
          See everything Orbit found →
        </button>
      </div>
    </div>
  );
}

function AutopilotStep({ onNext, onSkip }: { onNext: (tier: string, limitCents: number) => void; onSkip: () => void }) {
  const [tier, setTier] = useState("notify_and_do");
  const [limitCents, setLimitCents] = useState(50000);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Set up Autopilot</h2>
        <p className="text-gray-500 mt-1 text-sm">Want Orbit to handle this automatically next time?</p>
      </div>

      <div className="space-y-2">
        {[
          { value: "suggest_only", label: "Just show me", desc: "I'll take all actions" },
          { value: "notify_and_do", label: "Notify & Do", desc: "Act first, tell me right away" },
          { value: "full_auto", label: "Full autopilot", desc: "Handle everything, weekly review" },
        ].map(({ value, label, desc }) => (
          <button
            key={value}
            onClick={() => setTier(value)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              tier === value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              tier === value ? "border-blue-500" : "border-gray-300"
            }`}>
              {tier === value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            {value === "notify_and_do" && <span className="ml-auto text-xs text-blue-600 font-medium">Recommended</span>}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Daily limit</p>
          <p className="text-sm font-bold text-gray-900">${(limitCents / 100).toFixed(0)}</p>
        </div>
        <input
          type="range"
          min={10000}
          max={200000}
          step={10000}
          value={limitCents}
          onChange={(e) => setLimitCents(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$100</span><span>$2,000</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => onNext(tier, limitCents)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors"
        >
          Start Autopilot
        </button>
        <button onClick={onSkip} className="w-full text-gray-400 text-sm py-1 hover:text-gray-600 transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

function NotificationsStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-5xl">🔔</div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Stay in the loop</h2>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          We'll notify you when Orbit takes an action or finds something worth your attention.
        </p>
        <p className="text-xs text-gray-400 mt-2">Quiet hours respected. Max 3/day.</p>
      </div>
      <div className="space-y-2">
        <button onClick={onNext} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-colors">
          Yes, keep me posted
        </button>
        <button onClick={onSkip} className="w-full text-gray-400 text-sm py-1 hover:text-gray-600 transition-colors">
          No thanks
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  async function startDemo() {
    setDemoLoading(true);
    try {
      const res = await apiFetch<{ user: User & { name?: string }; accessToken: string; refreshToken: string; demo: boolean }>("/api/v1/auth/demo", { method: "POST" });
      if (res.error) return;
      const { user, accessToken, refreshToken } = res.data;
      login({ accessToken, refreshToken }, user);
      localStorage.setItem("orbit_demo", "true");
      navigate({ to: "/dashboard" });
    } finally {
      setDemoLoading(false);
    }
  }

  async function finishOnboarding() {
    localStorage.setItem("orbit_onboarded", "true");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {step !== "welcome" && <ProgressDots step={step} />}

        {step === "welcome" && (
          <WelcomeStep
            onNext={() => setStep("connect")}
            onDemo={demoLoading ? () => {} : startDemo}
          />
        )}
        {step === "connect" && (
          <ConnectStep
            onNext={() => setStep("insights")}
            onSkip={() => { startDemo().catch(() => {}); }}
          />
        )}
        {step === "insights" && (
          <InsightStep
            onAction={() => setStep("autopilot")}
            onSkip={() => setStep("autopilot")}
          />
        )}
        {step === "autopilot" && (
          <AutopilotStep
            onNext={async (_tier, _limit) => {
              setStep("notifications");
            }}
            onSkip={() => setStep("notifications")}
          />
        )}
        {step === "notifications" && (
          <NotificationsStep
            onNext={finishOnboarding}
            onSkip={finishOnboarding}
          />
        )}
      </div>
    </div>
  );
}
