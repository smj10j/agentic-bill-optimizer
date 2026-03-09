/**
 * Tests for apiFetch — verifies that the Authorization header is automatically
 * attached from localStorage so authenticated lib functions don't silently
 * send requests without credentials.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── localStorage mock ────────────────────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// ─── fetch mock ───────────────────────────────────────────────────────────────

type CapturedCall = { url: string; init: RequestInit | undefined };
const capturedCalls: CapturedCall[] = [];

function mockFetch(status = 200, body: unknown = { data: null, error: null }) {
  capturedCalls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedCalls.push({ url: String(input), init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    })
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setStoredToken(token: string | null) {
  localStorageMock.clear();
  if (token) {
    localStorageMock.setItem(
      "orbit_auth",
      JSON.stringify({ accessToken: token, refreshToken: "rt_test" })
    );
  }
}

function lastAuthHeader(): string | null {
  const call = capturedCalls[capturedCalls.length - 1];
  if (!call?.init?.headers) return null;
  const h = call.init.headers as Record<string, string>;
  return h["Authorization"] ?? null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("apiFetch", () => {
  beforeEach(() => {
    localStorageMock.clear();
    capturedCalls.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends Authorization header automatically from localStorage", async () => {
    setStoredToken("eytest.token.value");
    mockFetch(200, { data: {}, error: null });

    // Dynamic import to pick up the module after localStorage is primed
    const { apiFetch } = await import("./api.js");
    await apiFetch("/some/endpoint");

    expect(lastAuthHeader()).toBe("Bearer eytest.token.value");
  });

  it("sends no Authorization header when localStorage has no token", async () => {
    // No token stored
    mockFetch(200, { data: {}, error: null });

    const { apiFetch } = await import("./api.js");
    await apiFetch("/some/endpoint");

    expect(lastAuthHeader()).toBeNull();
  });

  it("explicit token option overrides localStorage", async () => {
    setStoredToken("stored.token");
    mockFetch(200, { data: {}, error: null });

    const { apiFetch } = await import("./api.js");
    await apiFetch("/some/endpoint", { token: "explicit.override.token" });

    expect(lastAuthHeader()).toBe("Bearer explicit.override.token");
  });

  it("clears localStorage on 401 response", async () => {
    setStoredToken("expired.token");
    mockFetch(401, { data: null, error: { code: "UNAUTHORIZED", message: "Token expired" } });

    const { apiFetch } = await import("./api.js");
    await apiFetch("/some/endpoint");

    expect(localStorageMock.getItem("orbit_auth")).toBeNull();
  });

  it("includes token on all HTTP methods (POST, PUT, DELETE)", async () => {
    setStoredToken("multi.method.token");
    mockFetch(200, { data: null, error: null });

    const { apiFetch } = await import("./api.js");

    for (const method of ["POST", "PUT", "DELETE"] as const) {
      capturedCalls.length = 0;
      await apiFetch("/endpoint", { method });
      expect(lastAuthHeader()).toBe("Bearer multi.method.token");
    }
  });
});

// ─── Regression: no double-prefixed /api/v1 paths ─────────────────────────────
// apiFetch prepends API_BASE (/api/v1) automatically. Lib functions must pass
// relative paths like "/insights", never "/api/v1/insights".

describe("apiFetch path convention (regression)", () => {
  it("no lib file passes a /api/v1/-prefixed path to apiFetch", async () => {
    const { readdirSync, readFileSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");

    const dir = join(dirname(fileURLToPath(import.meta.url)));
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(join(dir, file), "utf-8");
      // Match apiFetch("... or apiFetch(`... followed by /api/v1/
      if (/apiFetch\([`"']\/api\/v1\//.test(content)) {
        violations.push(file);
      }
    }

    expect(
      violations,
      `These lib files pass a double-prefixed /api/v1/ path to apiFetch (apiFetch already prepends /api/v1): ${violations.join(", ")}`
    ).toHaveLength(0);
  });
});
