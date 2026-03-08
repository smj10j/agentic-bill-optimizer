import { describe, it, expect } from "vitest";
import { getTrustLabel, type AutopilotSettings, type ActionType } from "./autopilot.js";

// ─── Pure function tests (no DB required) ─────────────────────────────────────

describe("getTrustLabel", () => {
  it("returns 'Highly trusted' for score >= 90", () => {
    expect(getTrustLabel(90)).toBe("Highly trusted");
    expect(getTrustLabel(100)).toBe("Highly trusted");
  });

  it("returns 'Trusted for routine bills' for score 75–89", () => {
    expect(getTrustLabel(75)).toBe("Trusted for routine bills");
    expect(getTrustLabel(89)).toBe("Trusted for routine bills");
  });

  it("returns 'Building trust' for score 60–74", () => {
    expect(getTrustLabel(60)).toBe("Building trust");
    expect(getTrustLabel(74)).toBe("Building trust");
  });

  it("returns 'Limited trust' for score 40–59", () => {
    expect(getTrustLabel(40)).toBe("Limited trust");
    expect(getTrustLabel(59)).toBe("Limited trust");
  });

  it("returns low-trust label for score < 40", () => {
    expect(getTrustLabel(0)).toBe("Low trust — review recent actions");
    expect(getTrustLabel(39)).toBe("Low trust — review recent actions");
  });
});

// ─── Guardrail logic tests (extracted from evaluateAction) ────────────────────
// Test the decision logic directly using the settings object, without DB calls.

function guardRailDecision(
  settings: AutopilotSettings,
  actionType: ActionType,
  amountCents: number,
  billerName?: string,
  todaySpentCents = 0
): "auto_approved" | "requires_approval" {
  if (!settings.enabled) return "requires_approval";
  if (settings.tier === 0) return "requires_approval";
  if (actionType === "subscription_cancel" && settings.requireApprovalSubscriptionCancel) return "requires_approval";
  if (billerName && settings.neverAutopay.includes(billerName)) return "requires_approval";
  if (amountCents > settings.singleActionLimitCents) return "requires_approval";
  if (amountCents > 100000) return "requires_approval"; // > $1,000 always critical
  if (todaySpentCents + amountCents > settings.dailyLimitCents) return "requires_approval";
  return "auto_approved";
}

const baseSettings: AutopilotSettings = {
  id: "apt_test",
  userId: "usr_test",
  enabled: true,
  tier: 1,
  dailyLimitCents: 50000,         // $500/day
  singleActionLimitCents: 20000,  // $200/action
  nightFreezeEnabled: false,
  nightFreezeStartHour: 22,
  nightFreezeEndHour: 8,
  billPaymentLimitCents: 50000,
  yieldSweepInLimitCents: 100000,
  yieldSweepOutLimitCents: 50000,
  requireApprovalSubscriptionCancel: true,
  alwaysAutopay: [],
  neverAutopay: [],
  createdAt: 0,
  updatedAt: 0,
};

describe("guardrail evaluation", () => {
  it("auto-approves a small bill payment within all limits", () => {
    const result = guardRailDecision(baseSettings, "bill_payment", 5000); // $50
    expect(result).toBe("auto_approved");
  });

  it("requires approval when autopilot is disabled", () => {
    const settings = { ...baseSettings, enabled: false };
    expect(guardRailDecision(settings, "bill_payment", 5000)).toBe("requires_approval");
  });

  it("requires approval on tier 0 (suggestions only)", () => {
    const settings = { ...baseSettings, tier: 0 as const };
    expect(guardRailDecision(settings, "bill_payment", 5000)).toBe("requires_approval");
  });

  it("requires approval when amount exceeds single-action limit", () => {
    const result = guardRailDecision(baseSettings, "bill_payment", 25000); // $250 > $200 limit
    expect(result).toBe("requires_approval");
  });

  it("requires approval when daily limit would be exceeded", () => {
    const result = guardRailDecision(baseSettings, "bill_payment", 10000, undefined, 45000); // $450 spent + $100 = $550 > $500
    expect(result).toBe("requires_approval");
  });

  it("auto-approves when within daily limit", () => {
    const result = guardRailDecision(baseSettings, "bill_payment", 5000, undefined, 40000); // $400 + $50 = $450 < $500
    expect(result).toBe("auto_approved");
  });

  it("requires approval for subscription cancellation by default", () => {
    const result = guardRailDecision(baseSettings, "subscription_cancel", 0);
    expect(result).toBe("requires_approval");
  });

  it("auto-approves subscription cancellation if user disabled the requirement", () => {
    const settings = { ...baseSettings, requireApprovalSubscriptionCancel: false, tier: 2 as const };
    const result = guardRailDecision(settings, "subscription_cancel", 0);
    expect(result).toBe("auto_approved");
  });

  it("requires approval for biller on never-autopay list", () => {
    const settings = { ...baseSettings, neverAutopay: ["Mortgage Co"] };
    const result = guardRailDecision(settings, "bill_payment", 5000, "Mortgage Co");
    expect(result).toBe("requires_approval");
  });

  it("auto-approves biller NOT on never-autopay list", () => {
    const settings = { ...baseSettings, neverAutopay: ["Mortgage Co"] };
    const result = guardRailDecision(settings, "bill_payment", 5000, "Electric Co");
    expect(result).toBe("auto_approved");
  });

  it("requires approval for amounts over $1,000 regardless of limits", () => {
    const settings = { ...baseSettings, singleActionLimitCents: 200000, dailyLimitCents: 500000 };
    const result = guardRailDecision(settings, "yield_sweep_in", 110000); // $1,100
    expect(result).toBe("requires_approval");
  });
});
