import React, { useState, useEffect, useRef } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../store/auth";
import { getNotifications, markAllRead, dismissNotification, markRead, type Notification } from "../lib/notifications.js";

type NavItem = {
  to: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/agent", label: "Agent", icon: "🤖" },
  { to: "/insights", label: "Insights", icon: "💡" },
  { to: "/bills", label: "Bills", icon: "📋" },
  { to: "/subscriptions", label: "Subscriptions", icon: "🔄" },
  { to: "/yield", label: "Yield", icon: "📈" },
  { to: "/autopilot", label: "Autopilot", icon: "✈️" },
  { to: "/history", label: "History", icon: "📜" },
  { to: "/accounts", label: "Accounts", icon: "🏦" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
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

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  normal: "bg-blue-400",
  info: "bg-gray-400",
};

function NotificationFeed({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { notifications: n } = await getNotifications();
      setNotifications(n);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  async function handleMarkAll() {
    await markAllRead();
    void load();
  }

  async function handleDismiss(id: string) {
    await dismissNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleRead(id: string) {
    await markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: Math.floor(Date.now() / 1000) } : n));
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Notifications</p>
        <div className="flex items-center gap-2">
          <button onClick={handleMarkAll} className="text-xs text-blue-600 hover:text-blue-800">Mark all read</button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {loading && (
          <div className="p-4 text-center text-sm text-gray-400 animate-pulse">Loading...</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">You're all caught up!</div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => { if (!n.readAt) void handleRead(n.id); }}
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
              n.readAt ? "opacity-60" : ""
            }`}
          >
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[n.priority] ?? "bg-gray-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
              {n.actionUrl && (
                <Link to={n.actionUrl} onClick={onClose} className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
                  {n.actionLabel ?? "View"}
                </Link>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); void handleDismiss(n.id); }}
              className="text-gray-300 hover:text-gray-500 text-sm leading-none mt-0.5 shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { unreadCount: cnt } = await getNotifications(true);
        setUnreadCount(cnt);
      } catch { /* ignore */ }
    };
    void load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationFeed onClose={() => setOpen(false)} />}
    </div>
  );
}

function DemoBanner() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function exitDemo() {
    localStorage.removeItem("orbit_demo");
    logout();
    void navigate({ to: "/login" });
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm">
      <span className="font-medium">Demo Mode — Alex's finances</span>
      <button onClick={exitDemo} className="text-amber-100 hover:text-white underline text-xs">
        Connect my real accounts →
      </button>
    </div>
  );
}

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const { logout } = useAuth();
  const isDemo = localStorage.getItem("orbit_demo") === "true";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isDemo && <DemoBanner />}
      {/* Top header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Orbit</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
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
