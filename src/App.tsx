import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Products } from "./pages/Products";
import { ProductDetail } from "./pages/ProductDetail";
import { Stores } from "./pages/Stores";
import { StoreDetail } from "./pages/StoreDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CustomerDashboard } from "./pages/Dashboards";
import { OrderTracking } from "./pages/OrderTracking";
import { NotFound } from "./pages/NotFound";
import { Toaster } from "sonner";

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
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
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="order-tracking/:id" element={<OrderTracking />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin Branch */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="categories" element={<AdminCategories />} />
            </Route>

            {/* Seller Branch - No Header/Footer from main Layout */}
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboard />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="reports" element={<SellerReports />} />
              <Route path="reviews" element={<SellerReviews />} />
              <Route path="profile" element={<StoreProfile />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster position="top-center" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}
