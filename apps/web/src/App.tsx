import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { AuthProvider } from "./store/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import AgentPage from "./pages/AgentPage";
import BillsPage from "./pages/BillsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import YieldPage from "./pages/YieldPage";
import AutopilotPage from "./pages/AutopilotPage";
import ActionHistoryPage from "./pages/ActionHistoryPage";
import AccountsPage from "./pages/AccountsPage";

// ─── Root route ──────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return <Outlet />;
}

// ─── Public routes ────────────────────────────────────────────────────────────

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupPage,
});

// ─── Protected layout route ───────────────────────────────────────────────────

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  beforeLoad: () => {
    const raw = localStorage.getItem("orbit_auth");
    if (!raw) throw redirect({ to: "/login" });
    try {
      const parsed = JSON.parse(raw) as { accessToken?: string };
      if (!parsed.accessToken) throw redirect({ to: "/login" });
    } catch (err) {
      // If redirect, rethrow; otherwise redirect
      if (err instanceof Response || (err && typeof err === "object" && "to" in err)) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

// ─── Index redirect ───────────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

// ─── Protected pages ──────────────────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const agentRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/agent",
  component: AgentPage,
});

const billsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/bills",
  component: BillsPage,
});

const subscriptionsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/subscriptions",
  component: SubscriptionsPage,
});

const yieldRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/yield",
  component: YieldPage,
});

const autopilotRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/autopilot",
  component: AutopilotPage,
});

const historyRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/history",
  component: ActionHistoryPage,
});

const accountsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/accounts",
  component: AccountsPage,
});

// ─── Router ───────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    agentRoute,
    billsRoute,
    subscriptionsRoute,
    yieldRoute,
    autopilotRoute,
    historyRoute,
    accountsRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
