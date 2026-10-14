import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { motion } from "motion/react";
import { 
  Package, 
  Warehouse, 
  PhilippinePeso,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Plus
} from "lucide-react";
import { Link } from "react-router";

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function SellerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiService.getSellerDashboard();
        if (response.status === "success") {
          setStats(response.data);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60rem]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Products",
      value: stats.total_products || 0,
      icon: Package,
      color: "bg-blue-500",
      description: "Listed heritage artifacts"
    },
    {
      title: "Total Stock",
      value: stats.total_stock || 0,
      icon: Warehouse,
      color: "bg-primary",
      description: "Total combined inventory"
    },
    {
      title: "Inventory Value",
      value: `₱${(stats.inventory_value || 0).toLocaleString()}`,
      icon: PhilippinePeso,
      color: "bg-green-500",
      description: "Estimated market value"
    },
    {
      title: "Low Stock Alert",
      value: stats.low_stock_count || 0,
      icon: AlertCircle,
      color: "bg-red-500",
      description: "Needs urgent replenishment",
      warning: stats.low_stock_count > 0
    }
  ];

  return (
    <div className="p-10 lg:p-20 space-y-16 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Artisan Merchant Hub</span>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic mt-2">
            Workshop <span className="text-primary underline underline-offset-8 decoration-4">Overview</span>
          </h1>
        </div>
        <Link 
          to="/seller/products" 
          className="group flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-gray-200"
        >
          <Plus size={16} /> Add New artifact
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-10 rounded-[3rem] bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 group ${card.warning ? 'border-red-100 bg-red-50/10' : ''}`}
          >
            <div className={`w-14 h-14 rounded-2xl ${card.color} flex items-center justify-center text-white mb-8 shadow-lg shadow-${card.color.split('-')[1]}/20 group-hover:rotate-12 transition-transform duration-300`}>
              <card.icon size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">{card.title}</p>
              <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{card.value}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2">{card.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[4rem] border border-gray-100 p-12 shadow-sm min-h-[500px]">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-2xl font-black italic tracking-tighter text-gray-900">Recent Sales Trend</h2>
            <Link to="/seller/reports" className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:underline underline-offset-4">
              Full Report <ArrowRight size={12} />
            </Link>
          </div>
          
          <div className="h-[350px] w-full">
            {stats.trend && stats.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend}>
                  <defs>
                    <linearGradient id="colorDashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4B483" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#D4B483" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#D1D5DB' }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#D1D5DB' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '15px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 900, color: '#D4B483' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#D4B483" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorDashboardRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                <TrendingUp className="text-gray-200 w-16 h-16 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Waiting for your first sales data...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
           <div>
             <h2 className="text-3xl font-black italic tracking-tighter mb-4">Top Performing</h2>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-10">Historical Benchmarks</p>
             
             <div className="space-y-8">
               {stats.topSelling && stats.topSelling.length > 0 ? stats.topSelling.map((item: any, i: number) => (
                 <div key={i} className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">#{i+1} artifact</span>
                       <Link to="/seller/products" className="text-xs font-black italic hover:text-primary transition-colors">{item.product_name}</Link>
                    </div>
                    <span className="text-xs font-black bg-white/10 px-3 py-1 rounded-full">{item.units_sold}</span>
                 </div>
               )) : (
                 <p className="text-xs font-black italic text-gray-500">No sales data yet.</p>
               )}
             </div>
           </div>
           
           <div className="pt-10">
             <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400 font-mono">Real-time DB connection active</p>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Live MySQL Connection</span>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
