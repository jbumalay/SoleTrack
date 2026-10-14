import { Outlet, useLocation, useNavigate } from "react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

export function Layout() {
  const { user, isAdmin, isSeller, cartCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Hide header/footer on login/register pages
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  
  // Auto-redirect if logged in and on root
  useEffect(() => {
    if (user && location.pathname === "/") {
      if (isAdmin) {
        navigate("/admin");
      } else if (isSeller) {
        navigate("/seller");
      }
    }
  }, [user, isAdmin, isSeller, navigate, location.pathname]);

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemCount={cartCount} />
      <main className="flex-1 bg-gray-50/50">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
