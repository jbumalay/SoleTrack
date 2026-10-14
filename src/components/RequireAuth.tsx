import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";

function LoginRedirect({ to }: { to: string }) {
  const location = useLocation();
  const redirect = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`${to}?redirect=${redirect}`} replace />;
}

/** Require any authenticated user. Redirects guests to /login?redirect=... */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <LoginRedirect to="/login" />;
  return <Outlet />;
}

/** Require a specific role. Redirects guests to login, wrong role to home. */
export function RequireRole({ role }: { role: "admin" | "seller" | "customer" }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <LoginRedirect to="/login" />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Redirect already-authenticated users away from login/register. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <>{children}</>;
  if (user) {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    if (redirect) return <Navigate to={redirect} replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "seller") return <Navigate to="/seller" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default ProtectedRoute;
