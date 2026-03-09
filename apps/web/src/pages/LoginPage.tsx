import { useState, FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";
import { useAuth } from "../store/auth";
import type { User } from "@orbit/shared";

type DemoResponse = { user: User; accessToken: string; refreshToken: string; demo: boolean };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleDemo() {
    setDemoLoading(true);
    try {
      const res = await apiFetch<DemoResponse>("/api/v1/auth/demo", { method: "POST" });
      if (res.error) { setError(res.error.message); return; }
      const { user, accessToken, refreshToken } = res.data;
      login({ accessToken, refreshToken }, user);
      localStorage.setItem("orbit_demo", "true");
      navigate({ to: "/dashboard" });
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (res.error) {
        setError(res.error.message);
        return;
      }

      const { user, accessToken, refreshToken } = res.data;
      login({ accessToken, refreshToken }, user);
      navigate({ to: "/dashboard" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">O</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your Orbit account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 px-4 font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center space-y-3">
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-gray-50 px-3">or</div>
          </div>
          <button
            onClick={handleDemo}
            disabled={demoLoading}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {demoLoading ? "Loading demo..." : "✨ Try Demo — see Orbit in action"}
          </button>
        </div>
      </div>
    </div>
  );
}
