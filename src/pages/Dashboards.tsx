import { useState, useEffect } from "react";
import { Link } from "react-router";
import { apiService } from "@/services/api";
import { motion } from "motion/react";
import { Package, TrendingUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CancelModal } from "@/components/CancelModal";

export function CustomerDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await apiService.getMyOrders();
        if (response.status === "success") {
          setOrders(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end mb-16">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Patron Profile</span>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic mt-2">Personal <span className="text-primary underline underline-offset-8 decoration-4">Dashboard</span></h1>
          </div>
          <div className="bg-white px-8 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Authenticated Artisan</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Orders Main */}
          <div className="w-full">
            <div className="bg-white rounded-[4rem] p-12 border border-gray-100 min-h-[600px] shadow-sm">
              <h2 className="text-2xl font-black mb-12 flex items-center gap-4 italic tracking-tight">
                Heritage Journey
                <span className="w-8 h-[2px] bg-primary" />
              </h2>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                   <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20 px-10">
                  <Package className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                  <p className="text-gray-400 font-black italic uppercase text-xs tracking-widest leading-relaxed">Your journey is just beginning. No artifacts have been commissioned yet.</p>
                  <Link to="/products" className="mt-8 inline-block text-primary font-black uppercase text-[10px] tracking-widest hover:underline underline-offset-8">Browse Collection</Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {orders.map((order) => (
                    <motion.div 
                      key={order.order_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group p-8 rounded-[2.5rem] bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-2xl hover:scale-[1.01] transition-all duration-500"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-6 mb-8">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
                            {order.order_date ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 italic">Status</div>
                          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                            order.order_status === 'delivered' ? 'bg-green-50 text-green-600 border border-green-100' :
                            order.order_status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                            order.order_status === 'shipped' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            order.order_status === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-100' :
                            'bg-gray-50 text-gray-600 border border-gray-100'
                          }`}>
                            {order.order_status}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-8 space-y-4">
                        {order.items && order.items.length > 0 ? (
                          <>
                            {order.items.slice(0, 3).map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-4">
                                <Link to={`/product/${item.product_id}`} className="w-14 h-14 rounded-xl bg-white border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                                   <img 
                                    src={item.image_url || item.image || 'https://images.unsplash.com/photo-1603487742131-416a4220b29a?q=80&w=100&h=100&fit=crop'} 
                                    alt={item.product_name} 
                                    className="w-full h-full object-cover"
                                   />
                                </Link>
                                <div className="flex-1">
                                   <Link to={`/product/${item.product_id}`} className="text-xs font-black italic text-gray-900 hover:text-primary transition-colors">{item.product_name}</Link>
                                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Qty: {item.quantity} • Size: {item.size_value || 'Std'}</p>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-1">+{order.items.length - 3} more heritage items</p>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] text-gray-400 font-bold italic uppercase tracking-widest">Heritage items loading...</p>
                        )}
                      </div>

                      <div className="flex flex-wrap justify-between items-end gap-6 pt-8 border-t border-gray-100">
                        <div className="space-y-4">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Destination</div>
                            <p className="text-xs font-bold text-gray-600 line-clamp-1 max-w-sm">{order.shipping_address}</p>
                          </div>
                          <Link 
                            to={`/order-tracking/${order.order_id}`} 
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline hover:scale-105 transition-all"
                          >
                            Track Journey <TrendingUp size={12} />
                          </Link>
                          {["pending", "confirmed"].includes(order.order_status) && (
                            <button
                              onClick={() => setCancellingId(order.order_id)}
                              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:text-red-600 hover:underline hover:scale-105 transition-all mt-6"
                            >
                              Cancel Order <XCircle size={12} />
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-black uppercase tracking-widest text-primary italic mb-1">Total Investment</div>
                           <div className="text-2xl font-black italic">₱{Number(order.total_amount).toLocaleString()}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CancelModal
        isOpen={cancellingId !== null}
        onClose={() => setCancellingId(null)}
        onConfirm={async () => {
          if (cancellingId === null) return;
          try {
            await apiService.cancelOrder(cancellingId);
            toast.success("Order cancelled");
            window.location.reload();
          } catch {
            toast.error("Failed to cancel order");
          }
        }}
      />
    </div>
  );
}
