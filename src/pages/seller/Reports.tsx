import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { motion } from "motion/react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  BarChart3, 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Wallet,
  ArrowUpRight,
  TrendingDown,
  Package,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";

const COLORS = ['#D4B483', '#48A9A6', '#C1666B', '#4281A4', '#FE938C'];

export default function SellerReports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [isRangeOpen, setIsRangeOpen] = useState(false);

  async function fetchReports() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getSellerReports(days);
      if (response.status === "success") {
        setData(response.data);
      } else {
        setError(response.message || "Failed to load reports");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reports error";
      setError(message);
      toast.error(message);
      console.error("Reports error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [days]);

  const exportToCSV = () => {
    if (!data || !Array.isArray(data.topSelling)) return;
    const items = Array.isArray(data.topSelling) ? data.topSelling : [];
    const header = ["Product Name", "Units Sold", "Revenue"];
    const rows = items.map((i: any) => [i.product_name, i.units_sold, i.revenue]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + header.join(",") + "\n"
      + rows.map((e: any) => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SoleTrack_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4 p-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Reports unavailable</p>
        <p className="text-sm text-gray-500 font-medium">{error || "No report data."}</p>
        <button onClick={fetchReports} className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">Retry</button>
      </div>
    );
  }

  const metrics = data.metrics || {};
  const topSelling: any[] = Array.isArray(data.topSelling) ? data.topSelling : [];
  const trend: any[] = Array.isArray(data.trend) ? data.trend : [];
  const categoryBreakdown: any[] = Array.isArray(data.categoryBreakdown) ? data.categoryBreakdown : [];
  const maxRevenue = topSelling.length > 0 ? topSelling[0].revenue : 1;

  const metricStats = [
    { label: "Total Revenue", value: `₱${(metrics.total_revenue || 0).toLocaleString()}`, icon: Wallet },
    { label: "Total Orders", value: metrics.total_orders || 0, icon: ShoppingBag },
    { label: "Avg. Order Value", value: `₱${Math.round(metrics.aov || 0).toLocaleString()}`, icon: TrendingUp },
    { label: "Products Sold", value: metrics.products_sold || 0, icon: Package }
  ];

  return (
    <div className="p-10 lg:p-20 space-y-16 max-w-[120rem] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Advanced Analytics</span>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic mt-2">
            Sales <span className="text-primary underline underline-offset-8 decoration-4">Intelligence</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsRangeOpen(!isRangeOpen)}
              className={`flex items-center gap-3 px-8 py-4 bg-white border ${isRangeOpen ? 'border-primary' : 'border-gray-100'} rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-all shadow-sm`}
            >
              <Calendar size={16} /> Last {days} Days
            </button>
            
            {isRangeOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-2xl shadow-2xl border border-gray-50 p-2 z-50">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDays(d);
                      setIsRangeOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${days === d ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    Last {d} Days
                  </button>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200"
          >
            <Download size={16} /> Export Data
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {metricStats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-10 bg-white rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500"
          >
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-8">
              <stat.icon size={22} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">{stat.label}</p>
              <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-4">Cumulative Performance</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-[4rem] border border-gray-100 p-12 shadow-sm">
          <div className="flex justify-between items-center mb-16">
             <h2 className="text-2xl font-black italic tracking-tight">{days}-Day Revenue Journey</h2>
             <div className="flex gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Net Sales</span>
                </div>
             </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4B483" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#D4B483" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                  dy={20}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                  tickFormatter={(val) => `₱${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '20px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#D4B483' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#D4B483" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-[4rem] border border-gray-100 p-12 shadow-sm">
          <h2 className="text-2xl font-black italic tracking-tight mb-16">Category Reach</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                  nameKey="category_name"
                >
                  {categoryBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-8">
            {categoryBreakdown.length > 0 ? categoryBreakdown.map((cat: any, idx: number) => (
              <div key={cat.category_name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{cat.category_name}</span>
                </div>
                <span className="text-[10px] font-black text-gray-900 italic">₱{Number(cat.value ?? 0).toLocaleString()}</span>
              </div>
            )) : (
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 text-center py-6">No category data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-[4rem] border border-gray-100 p-12 shadow-sm">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-2xl font-black italic tracking-tight">Best-Selling Artifacts</h2>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary italic">
            Top 10 Performers <TrendingUp size={14} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="pb-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Rank</th>
                <th className="pb-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Artifact Name</th>
                <th className="pb-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Units Sold</th>
                <th className="pb-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Revenue (₱)</th>
                <th className="pb-8 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topSelling.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                      <ShoppingBag size={48} className="text-gray-300" />
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500">No sales artifacts to display yet</p>
                    </div>
                  </td>
                </tr>
              ) : topSelling.map((product: any, idx: number) => (
                <tr key={product.product_name} className="group">
                  <td className="py-8 font-black italic text-gray-300 text-lg">#{idx + 1}</td>
                  <td className="py-8 text-sm font-black italic text-gray-900">
                    <Link to={`/product/${product.product_id}`} className="hover:text-primary transition-colors">{product.product_name}</Link>
                  </td>
                  <td className="py-8">
                    <span className="text-xs font-black italic text-gray-600 bg-gray-100 px-4 py-2 rounded-xl">{product.units_sold}</span>
                  </td>
                  <td className="py-8 text-xs font-black italic">₱{Number(product.revenue).toLocaleString()}</td>
                  <td className="py-8 text-right">
                    <div className="inline-flex h-2 w-32 bg-gray-50 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000" 
                        style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                       />
                    </div>
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
