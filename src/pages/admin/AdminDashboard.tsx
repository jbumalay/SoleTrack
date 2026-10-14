import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { 
  Users, 
  ShoppingBag, 
  Package, 
  Wallet,
  ArrowUpRight,
  UserCheck,
  UserPlus,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  BarChart3
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from "motion/react";
import { Link } from "react-router";
import { normalizeList } from "@/utils/normalizeList";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getAdminDashboard();
      if (response.status === "success") {
        setData(response.data);
      } else {
        setError(response.message || "Failed to load dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch admin dashboard";
      setError(message);
      toast.error(message);
      console.error("Failed to fetch admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return (
    <div className="p-10 flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="p-10 flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500">
        <AlertCircle size={40} />
      </div>
      <div>
        <h2 className="text-xl font-black italic tracking-tighter text-gray-900 uppercase">Dashboard Failed</h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{error}</p>
      </div>
      <button onClick={fetchDashboard} className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">Retry</button>
    </div>
  );

  if (!data) return null;

  const recentOrders = normalizeList(data.recent_orders) ?? [];
  const stats = [
    { label: "Total Platform Users", value: data.total_users, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Active Customers", value: data.customer_count, icon: UserCheck, color: "bg-green-50 text-green-600" },
    { label: "Partnered Sellers", value: data.seller_count, icon: UserPlus, color: "bg-purple-50 text-purple-600" },
    { label: "Platform Revenue", value: `₱${(data.total_revenue || 0).toLocaleString()}`, icon: Wallet, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">
            Platform Overview
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
            Central monitoring & user governance
          </p>
        </div>
        <div className="flex items-center gap-4">
           {data.pending_approvals > 0 && (
             <Link 
               to="/admin/users?status=pending_approval"
               className="flex items-center gap-3 px-6 py-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-amber-600 animate-pulse"
             >
               <AlertCircle size={16} /> 
               {data.pending_approvals} Sellers Awaiting Approval
             </Link>
           )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black italic text-gray-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Platform Recent Orders</h3>
            <Link to="/admin/reports" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View All Reports</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50/50">
                 <tr>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {recentOrders.map((order: any) => (
                   <tr key={order.order_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6 text-xs font-black italic text-gray-900">#{order.order_id}</td>
                      <td className="px-8 py-6 text-xs font-bold text-gray-600">{order.first_name} {order.last_name}</td>
                      <td className="px-8 py-6 text-xs font-black italic text-gray-900">₱{Number(order.total_amount ?? 0).toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-[10px] font-medium text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / System Health */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-[40px] p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <ShieldCheck size={120} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">System Control</p>
            <h3 className="text-3xl font-black italic leading-none mb-8 tracking-tighter">
              Manage the SoleTrack ecosystem.
            </h3>
            <div className="space-y-3">
               <Link to="/admin/users" className="flex items-center justify-between p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">User Governance</span>
                  </div>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
               </Link>
               <Link to="/admin/reports" className="flex items-center justify-between p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <BarChart3 size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Platform Intel</span>
                  </div>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
               </Link>
               <Link to="/admin/categories" className="flex items-center justify-between p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Catalog Structures</span>
                  </div>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
               </Link>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Platform Health</h3>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-500">Online</span>
               </div>
             </div>
             <div className="space-y-6">
                <div>
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-gray-400">Infrastructure</span>
                      <span className="text-gray-900">Stable</span>
                   </div>
                   <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-primary rounded-full" />
                   </div>
                </div>
                <div>
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-gray-400">Database Engine</span>
                      <span className="text-gray-900">MySQL Primary</span>
                   </div>
                   <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-primary rounded-full" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
