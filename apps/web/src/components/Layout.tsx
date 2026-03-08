import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "../store/auth";

type NavItem = {
  to: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/agent", label: "Agent", icon: "🤖" },
  { to: "/bills", label: "Bills", icon: "📋" },
  { to: "/subscriptions", label: "Subscriptions", icon: "🔄" },
  { to: "/yield", label: "Yield", icon: "📈" },
  { to: "/autopilot", label: "Autopilot", icon: "✈️" },
];

function NavLink({ item, compact }: { item: NavItem; compact?: boolean }) {
  const router = useRouterState();
  const isActive = router.location.pathname === item.to;

  if (compact) {
    return (
      <Link
        to={item.to}
        className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
          isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-800"
        }`}
      >
        <span className="text-xl leading-none">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={item.to}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className="text-lg leading-none">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Orbit</span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <nav className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 py-4 px-3 gap-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around z-30">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} item={item} compact />
        ))}
      </nav>
    </div>
  );
}
