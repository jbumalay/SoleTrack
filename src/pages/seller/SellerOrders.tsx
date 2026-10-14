import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  User,
  MapPin,
  CreditCard,
  X,
  XCircle,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { normalizeList } from "@/utils/normalizeList";

export default function SellerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const response = await apiService.getSellerOrders({ page: 1, limit: 100 });
      if (response.status === "success") {
        setOrders(normalizeList(response.data) ?? []);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load orders");
      setOrders([]);
      console.error("Orders error:", err);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await apiService.updateSellerOrderStatus(orderId, newStatus);
      if (response.status === "success") {
        toast.success(`Artifact status updated to ${newStatus}`);
        fetchOrders();
        if (selectedOrder) setSelectedOrder({...selectedOrder, order_status: newStatus});
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const statusConfig: any = {
    pending: { color: "bg-orange-50 text-orange-600 border-orange-100", label: "Pending Fulfillment", icon: Clock },
    confirmed: { color: "bg-blue-50 text-blue-600 border-blue-100", label: "Craft Confirmed", icon: CheckCircle },
    shipped: { color: "bg-purple-50 text-purple-600 border-purple-100", label: "In Transit", icon: Truck },
    delivered: { color: "bg-green-50 text-green-600 border-green-100", label: "Arrived", icon: Package },
    cancelled: { color: "bg-red-50 text-red-600 border-red-100", label: "Cancelled", icon: XCircle }
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusConfig[status]?.icon || Clock;
    return <Icon size={14} />;
  };

  return (
    <div className="p-10 lg:p-20 space-y-16 max-w-[100rem] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Logistics & Fulfillment</span>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic mt-2">
            Incoming <span className="text-primary underline underline-offset-8 decoration-4">Commissions</span>
          </h1>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {Object.entries(statusConfig).map(([key, config]: [string, any]) => (
          <div key={key} className="bg-white p-8 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{config.label}</p>
              <p className="text-2xl font-black italic">{orders.filter(o => o.order_status === key).length}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
              <config.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 italic">Merchant Directives</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Commission ID</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Patron</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Investment</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Date Received</th>
                <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center font-black italic uppercase text-gray-400 tracking-widest text-xs">Waiting for future commissions...</td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order.order_id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-10 py-8">
                    <span className="text-xs font-black italic text-gray-900 tracking-tighter">#ORD-{order.order_id.toString().padStart(5, '0')}</span>
                  </td>
                  <td className="px-10 py-8 font-black italic text-gray-600 text-sm">{order.first_name} {order.last_name}</td>
                  <td className="px-10 py-8">
                    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusConfig[order.order_status]?.color || 'bg-gray-50'}`}>
                      {getStatusIcon(order.order_status)}
                      {statusConfig[order.order_status]?.label || order.order_status}
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="text-sm font-black italic">₱{Number(order.total_amount ?? 0).toLocaleString()}</span>
                  </td>
                  <td className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {new Date(order.order_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-10 py-8 text-right">
                     <button 
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDetailsOpen(true);
                      }}
                      className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-primary hover:border-primary transition-all group-hover:scale-110"
                     >
                       <ChevronRight size={18} />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Sliding Panel/Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="print-manifest bg-white rounded-[4rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-12 border-b border-gray-50 flex justify-between items-center">
                <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary">COMMISSION DETAILS</span>
                   <h2 className="text-4xl font-black italic tracking-tighter mt-1">#ORD-{selectedOrder.order_id.toString().padStart(5, '0')}</h2>
                </div>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-4 bg-gray-50 border border-gray-100 text-gray-400 rounded-3xl hover:text-gray-900 transition-colors"
                >
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {/* Left: General Info & Fulfillment */}
                   <div className="space-y-12">
                      <div className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 italic flex items-center gap-3">
                          <Package className="text-primary" size={16} /> Artifact Status management
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.keys(statusConfig).map((status) => (
                            <button
                              key={status}
                              onClick={() => updateStatus(selectedOrder.order_id, status)}
                              className={`p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                selectedOrder.order_status === status 
                                  ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]' 
                                  : 'bg-white border-gray-100 text-gray-400 hover:border-primary hover:text-primary'
                              }`}
                            >
                              {status === selectedOrder.order_status && <CheckCircle size={10} className="inline mr-2" />}
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-10 rounded-[3rem] bg-gray-50/50 border border-gray-100 space-y-8">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><User size={18} /></div>
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Patron Information</p>
                              <p className="text-sm font-black italic text-gray-900 mt-1">{selectedOrder.first_name} {selectedOrder.last_name}</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><MapPin size={18} /></div>
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Destination</p>
                              <p className="text-xs font-bold text-gray-600 mt-1 leading-relaxed">{selectedOrder.shipping_address}</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><CreditCard size={18} /></div>
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Payment Strategy</p>
                              <p className="text-xs font-bold text-gray-600 mt-1 uppercase tracking-widest">{selectedOrder.payment_method}</p>
                           </div>
                        </div>
                      </div>
                   </div>

                   {/* Right: Items */}
                   <div className="bg-white rounded-[4rem] border border-gray-100 p-10 flex flex-col shadow-sm">
                      <h3 className="text-lg font-black italic tracking-tighter mb-10 flex justify-between items-center">
                        Commissioned Artifacts
                        <span className="text-[8px] bg-gray-100 text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest">{selectedOrder.items?.length} items</span>
                      </h3>
                      <div className="flex-1 space-y-6">
                         {selectedOrder.items?.map((item: any, idx: number) => (
                           <div key={idx} className="flex items-center gap-6 p-4 rounded-3xl hover:bg-gray-50 transition-colors">
                              <Link to={`/product/${item.product_id}`} className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-sm shrink-0 block">
                                <img src={item.image_url || 'https://images.unsplash.com/photo-1603487742131-416a4220b29a?q=80&w=100&h=100&fit=crop'} className="w-full h-full object-cover" />
                              </Link>
                              <div className="flex-1">
                                <Link to={`/product/${item.product_id}`} className="text-xs font-black italic text-gray-900 hover:text-primary transition-colors">{item.product_name}</Link>
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">QTY: {item.quantity} • SIZE: {item.size_value || 'STD'}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-xs font-black italic">₱{(item.price_at_purchase * item.quantity).toLocaleString()}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-10 pt-10 border-t border-gray-50 space-y-4">
                        <div className="flex justify-between items-center text-xl font-black italic text-primary pt-4">
                          <span>Patron Investment</span>
                          <span>₱{Number(selectedOrder.total_amount).toLocaleString()}</span>
                        </div>
                      </div>
                   </div>
                </div>
              </div>

              <div className="p-12 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center">
                 <button onClick={() => window.print()} data-print="order-manifest" className="flex items-center gap-3 px-8 py-5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                    <ExternalLink size={16} /> Print Manifesto
                 </button>
                 <div className="flex gap-4">
                    {selectedOrder.order_status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(selectedOrder.order_id, 'confirmed')}
                        className="px-10 py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary transition-all shadow-xl shadow-gray-200"
                      >
                        Confirm Commission <ArrowRight size={14} />
                      </button>
                    )}
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
