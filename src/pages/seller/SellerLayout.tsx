import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Star,
  LogOut,
  Store,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function SellerLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'seller')) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  if (!user || user.role !== 'seller') return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (user.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[40px] p-12 text-center shadow-2xl shadow-gray-100 border border-gray-50"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Store className="text-primary w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-gray-900 mb-4 uppercase">
            Artistry in Review
          </h1>
          <p className="text-sm font-medium text-gray-500 leading-relaxed mb-10">
            Welcome to the SoleTrack collective. Your merchant account is currently being reviewed by our heritage curators.
          </p>
          <div className="bg-gray-50 rounded-2xl p-6 mb-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600">Pending Approval</span>
            </div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              Expected wait: 24-48 hours
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all duration-300 shadow-xl shadow-gray-200"
          >
            Logout & Return Home
          </button>
        </motion.div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/seller', icon: LayoutDashboard },
    { name: 'Products', href: '/seller/products', icon: Package },
    { name: 'Orders', href: '/seller/orders', icon: ShoppingCart },
    { name: 'Sales Reports', href: '/seller/reports', icon: BarChart3 },
    { name: 'Reviews', href: '/seller/reviews', icon: Star },
    { name: 'Store Profile', href: '/seller/profile', icon: Store },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-gray-100 sticky top-0 h-screen">
        <div className="p-10">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-primary/20">
              <Store className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black italic tracking-tighter block text-gray-900 group-hover:text-primary transition-colors">SOLETRACK</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Merchant Portal</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  isActive 
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                    : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-gray-50">
          <div className="flex items-center gap-4 px-4 py-6 rounded-3xl bg-gray-50/50 border border-gray-100 mb-6">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-black italic text-primary shadow-sm">
              {user.username?.[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{user.username}</p>
              <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-0.5">{user.brand_name || 'Artisan Seller'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white border-b border-gray-100 px-6 flex items-center justify-between z-50">
        <Link to="/" className="flex items-center gap-2">
          <Store className="text-primary w-6 h-6" />
          <span className="font-black italic tracking-tighter text-lg">SOLETRACK</span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-500"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-40 lg:hidden bg-white pt-24 px-6"
          >
            <nav className="space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-xl text-xs font-black uppercase tracking-widest ${
                    location.pathname === item.href ? 'bg-primary text-white' : 'text-gray-500'
                  }`}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-xs font-black uppercase tracking-widest text-red-500"
              >
                <LogOut size={20} />
                Logout
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-24 lg:pt-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
