import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  LogOut, 
  ShieldCheck,
  Package,
  ShoppingCart,
  Ticket,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Vouchers', href: '/admin/promos', icon: Ticket },
    { name: 'Product Catalog', href: '/admin/categories', icon: Package },
    { name: 'Platform Reports', href: '/admin/reports', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-gray-100 sticky top-0 h-screen">
        <div className="p-10">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-gray-200">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black italic tracking-tighter block text-gray-900 group-hover:text-primary transition-colors">SOLETRACK</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Admin Central</span>
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
                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 scale-[1.02]' 
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
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
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-black italic text-gray-900 shadow-sm">
              {user.username?.[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{user.username}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Control Tower</p>
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
          <ShieldCheck className="text-gray-900 w-6 h-6" />
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
                    location.pathname === item.href ? 'bg-gray-900 text-white' : 'text-gray-500'
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
