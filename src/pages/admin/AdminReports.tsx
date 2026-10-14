import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { 
  Wallet, 
  ShoppingBag, 
  Users, 
  Store,
  ChevronRight,
  Download, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from "motion/react";
import { toast } from "sonner";

export default function AdminReports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getAdminReports();
      if (response.status === "success") {
        setData(response.data);
      } else {
        setError(response.message || "Failed to load reports");
      }
    } catch (err: any) {
      console.error("Failed to fetch admin reports:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aggregating Platform Intel...</p>
    </div>
  );

  if (error) return (
    <div className="p-20 flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-4">
        <AlertCircle size={40} />
      </div>
      <div>
        <h2 className="text-xl font-black italic tracking-tighter text-gray-900 uppercase">Analysis Failed</h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{error}</p>
      </div>
      <button 
        onClick={fetchReports}
        className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all"
      >
        Retry Analysis
      </button>
    </div>
  );

  if (!data) return (
    <div className="p-20 text-center">
      <p className="text-xs font-black uppercase tracking-widest text-gray-400">No data available for reporting</p>
    </div>
  );

  const metricsData = data?.metrics || {};
  const trendData: any[] = Array.isArray(data?.trend) ? data.trend : [];
  const sellerBreakdown: any[] = Array.isArray(data?.sellerBreakdown) ? data.sellerBreakdown : [];

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#6366F1', '#A855F7', '#EC4899'];

  const metrics = [
    { label: "Total Platform Revenue", value: `₱${(metricsData.total_revenue || 0).toLocaleString()}`, icon: Wallet },
    { label: "Platform-wide Orders", value: metricsData.total_orders || 0, icon: ShoppingBag },
    { label: "Registered Users", value: metricsData.total_users || 0, icon: Users },
    { label: "Verified Active Sellers", value: metricsData.active_sellers || 0, icon: Store },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">
            Platform Intel
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
            Multi-dimensional performance tracking
          </p>
        </div>
        <button 
          onClick={() => {
            const rows: any[] = Array.isArray(sellerBreakdown) ? sellerBreakdown : [];
            if (rows.length === 0) { toast.info("No data to export yet"); }
            else {
              const header = ["Brand", "Orders", "Items Sold", "Revenue", "Status"];
              const csvRows = rows.map((r: any) => [JSON.stringify(r.brand_name ?? "Individual"), r.total_orders ?? 0, r.total_items_sold ?? 0, r.revenue ?? 0, JSON.stringify(r.status ?? "")].join(","));
              const csv = "data:text/csv;charset=utf-8," + header.join(",") + "\n" + csvRows.join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csv));
              link.setAttribute("download", "SoleTrack_Platform_Report.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success("Platform report exported");
            }
          }}
          className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200"
        >
          <Download size={16} /> Export Intelligence
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm"
          >
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-6 text-gray-400">
              <metric.icon size={20} />
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{metric.label}</p>
            <h3 className="text-2xl font-black italic text-gray-900">{metric.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">30-Day Revenue Trend</h3>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Platform-wide aggregate</p>
              </div>
              <div className="flex items-center gap-2 text-primary">
                 <TrendingUp size={16} />
                 <span className="text-[10px] font-black">Live Pulse</span>
              </div>
           </div>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    hide
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      fontFamily: 'inherit',
                      fontSize: '10px',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      padding: '12px'
                    }}
                    formatter={(value) => [`₱${(Number(value) || 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#F97316" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-10">Top Seller Contribution</h3>
           <div className="h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sellerBreakdown}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="brand_name"
                  >
                    {sellerBreakdown.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-6 space-y-3">
              {sellerBreakdown.slice(0, 3).map((seller: any, idx: number) => (
                <div key={seller.user_id} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-[10px] font-black italic text-gray-900 truncate max-w-[120px]">{seller.brand_name || 'Individual'}</span>
                   </div>
                   <span className="text-[10px] font-black text-gray-400">₱{(seller.revenue || 0).toLocaleString()}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Leaderboard: Top 10 Partners</h3>
           <Store size={18} className="text-gray-300" />
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                 <tr>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Partner Brand</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Orders</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Items Sold</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Yield (Revenue)</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Status</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {sellerBreakdown.map((seller: any) => (
                   <tr key={seller.user_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                         <p className="text-sm font-black italic text-gray-900">{seller.brand_name || 'Individual Artisan'}</p>
                         <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-1">{seller.first_name} {seller.last_name}</p>
                      </td>
                      <td className="px-8 py-6 text-center text-xs font-black italic text-gray-900">{seller.total_orders}</td>
                      <td className="px-8 py-6 text-center text-xs font-black italic text-gray-600">{seller.total_items_sold}</td>
                      <td className="px-8 py-6 text-xs font-black italic text-primary">₱{(seller.revenue || 0).toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          seller.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {seller.status}
                        </span>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
