import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute, RequireRole, RedirectIfAuthed } from "./components/RequireAuth";
import { Home } from "./pages/Home";
import { Products } from "./pages/Products";
import { ProductDetail } from "./pages/ProductDetail";
import { Stores } from "./pages/Stores";
import { StoreDetail } from "./pages/StoreDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Wishlist } from "./pages/Wishlist";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CustomerDashboard } from "./pages/Dashboards";
import { OrderTracking } from "./pages/OrderTracking";
import { Account } from "./pages/Account";
import { Invoice } from "./pages/Invoice";
import { NotFound } from "./pages/NotFound";
import { Toaster } from "sonner";

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminPromos = lazy(() => import("./pages/admin/AdminPromos"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const SellerLayout = lazy(() => import("./pages/seller/SellerLayout"));
const SellerDashboard = lazy(() => import("./pages/seller/Dashboard"));
const SellerProducts = lazy(() => import("./pages/seller/Products"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerReports = lazy(() => import("./pages/seller/Reports"));
const SellerReviews = lazy(() => import("./pages/seller/Reviews"));
const StoreProfile = lazy(() => import("./pages/seller/StoreProfile"));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-100/50">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="stores" element={<Stores />} />
              <Route path="store/:id" element={<StoreDetail />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
              <Route path="register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
              {/* Customer-protected */}
              <Route element={<RequireRole role="customer" />}>
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="dashboard" element={<CustomerDashboard />} />
              </Route>
              {/* Any authed user (backend enforces order ownership: buyer, selling seller, or admin) */}
              <Route element={<ProtectedRoute />}>
                <Route path="orders" element={<CustomerDashboard />} />
                <Route path="account" element={<Account />} />
                <Route path="invoice/:id" element={<Invoice />} />
                <Route path="order-tracking/:id" element={<OrderTracking />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin Branch */}
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="promos" element={<AdminPromos />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="categories" element={<AdminCategories />} />
              </Route>
            </Route>

            {/* Seller Branch - No Header/Footer from main Layout */}
            <Route element={<RequireRole role="seller" />}>
              <Route path="/seller" element={<SellerLayout />}>
                <Route index element={<SellerDashboard />} />
                <Route path="products" element={<SellerProducts />} />
                <Route path="orders" element={<SellerOrders />} />
                <Route path="reports" element={<SellerReports />} />
                <Route path="reviews" element={<SellerReviews />} />
                <Route path="profile" element={<StoreProfile />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
        <Toaster position="top-center" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}
