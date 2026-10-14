import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import {
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  X,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RotateCcw,
  CreditCard,
  User,
  MapPin,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { normalizeList } from "@/utils/normalizeList";

const STATUS_OPTIONS = ["", "pending", "confirmed", "shipped", "delivered", "cancelled", "requested", "approved"];
const PAGE_SIZE = 12;

const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
  pending: { color: "bg-orange-50 text-orange-600 border-orange-100", label: "Pending", icon: Clock },
  confirmed: { color: "bg-blue-50 text-blue-600 border-blue-100", label: "Confirmed", icon: CheckCircle },
  shipped: { color: "bg-purple-50 text-purple-600 border-purple-100", label: "In Transit", icon: Truck },
  delivered: { color: "bg-green-50 text-green-600 border-green-100", label: "Delivered", icon: Package },
  cancelled: { color: "bg-red-50 text-red-600 border-red-100", label: "Cancelled", icon: XCircle },
  requested: { color: "bg-amber-50 text-amber-600 border-amber-100", label: "Return Requested", icon: RotateCcw },
  approved: { color: "bg-teal-50 text-teal-600 border-teal-100", label: "Return Approved", icon: RotateCcw },
};

const paymentConfig: Record<string, string> = {
  unpaid: "bg-gray-50 text-gray-500 border-gray-100",
  paid: "bg-green-50 text-green-600 border-green-100",
  refunded: "bg-red-50 text-red-600 border-red-100",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [markingPayment, setMarkingPayment] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAdminOrders({
        search,
        status,
        page,
        limit: PAGE_SIZE,
      });
      if (response.status === "success") {
        setOrders(normalizeList(response.data) ?? []);
        setTotalPages(Number(response.data?.total_pages ?? 1) || 1);
        setTotalItems(Number(response.data?.total_items ?? 0) || 0);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 300);
    return () => clearTimeout(timer);
  }, [search, status, page]);

  const openDetail = async (orderId: number) => {
    setLoadingDetail(true);
    setSelectedOrder({ order_id: orderId });
    try {
      const response = await apiService.getAdminOrder(orderId);
      if (response.status === "success") setSelectedOrder(response.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load order");
      setSelectedOrder(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const markPayment = async (paymentStatus: "paid" | "refunded") => {
    if (!selectedOrder) return;
    setMarkingPayment(true);
    try {
      await apiService.markAdminOrderPayment(selectedOrder.order_id, paymentStatus);
      toast.success(`Order marked ${paymentStatus}`);
      setSelectedOrder({ ...selectedOrder, payment_status: paymentStatus });
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment");
    } finally {
      setMarkingPayment(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">
            Order Governance
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
            Platform-wide order oversight & payment control
          </p>
        </div>
        <div className="bg-white px-8 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{totalItems} total orders</span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by order id, email or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative md:col-span-2">
          <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all appearance-none shadow-sm cursor-pointer"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s || "all"} value={s}>{s === "" ? "All Statuses" : statusConfig[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Order</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Payment</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Total</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Placed</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-8 py-10 bg-gray-50/20" />
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Package size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No matching orders found</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map((order) => {
                const cfg = statusConfig[order.status] ?? { color: "bg-gray-50 text-gray-600 border-gray-100", label: order.status, icon: Clock };
                return (
                  <tr key={order.order_id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-8">
                      <span className="text-xs font-black italic text-gray-900 tracking-tighter">#ORD-{String(order.order_id).padStart(5, "0")}</span>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{order.item_count} item(s)</p>
                    </td>
                    <td className="px-8 py-8">
                      <p className="text-xs font-black italic text-gray-900">{order.first_name} {order.last_name || ""}</p>
                      <p className="text-[10px] font-medium text-gray-400">{order.email}</p>
                    </td>
                    <td className="px-8 py-8">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${cfg.color}`}>
                        <cfg.icon size={10} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-8 py-8">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${paymentConfig[order.payment_status] ?? "bg-gray-50"}`}>
                        <CreditCard size={10} /> {order.payment_status}
                      </span>
                    </td>
                    <td className="px-8 py-8">
                      <span className="text-sm font-black italic">₱{Number(order.total_amount ?? 0).toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                    </td>
                    <td className="px-8 py-8 text-right">
                      <button
                        onClick={() => openDetail(order.order_id)}
                        className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-primary hover:border-primary transition-all group-hover:scale-110"
                        title="View order"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-8 border-t border-gray-50 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-primary hover:border-primary transition-all disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-primary hover:border-primary transition-all disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="print-manifest bg-white rounded-[4rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-12 border-b border-gray-50 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Order Details</span>
                  <h2 className="text-4xl font-black italic tracking-tighter mt-1">#ORD-{String(selectedOrder.order_id).padStart(5, "0")}</h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-4 bg-gray-50 border border-gray-100 text-gray-400 rounded-3xl hover:text-gray-900 transition-colors"
                >
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-12">
                {loadingDetail && !selectedOrder.items ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary border border-gray-100"><User size={18} /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Customer</p>
                            <p className="text-sm font-black italic text-gray-900 mt-1">{selectedOrder.first_name} {selectedOrder.last_name || ""}</p>
                            <p className="text-[10px] font-bold text-gray-500">{selectedOrder.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary border border-gray-100"><MapPin size={18} /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Destination</p>
                            <p className="text-xs font-bold text-gray-600 mt-1 leading-relaxed">{selectedOrder.shipping_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary border border-gray-100"><CreditCard size={18} /></div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Payment</p>
                            <p className="text-xs font-bold text-gray-600 mt-1 uppercase tracking-widest">{selectedOrder.payment_status}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50/50 rounded-[3rem] border border-gray-100 p-8 space-y-6">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Order Status</p>
                          <p className="text-lg font-black italic text-gray-900 mt-1 uppercase tracking-widest">{selectedOrder.order_status ?? selectedOrder.status}</p>
                        </div>
                        {selectedOrder.promo_code && (
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Voucher</p>
                            <p className="text-sm font-black italic text-primary mt-1">{selectedOrder.promo_code} (−₱{Number(selectedOrder.discount_amount ?? 0).toLocaleString()})</p>
                          </div>
                        )}
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => markPayment("paid")}
                            disabled={markingPayment || selectedOrder.payment_status === "paid"}
                            className="flex-1 px-6 py-4 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all disabled:opacity-30"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => markPayment("refunded")}
                            disabled={markingPayment || selectedOrder.payment_status === "refunded"}
                            className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-30"
                          >
                            Mark Refunded
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 italic">Ordered Artifacts</h3>
                      {(selectedOrder.items ?? []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-6 p-4 rounded-3xl bg-gray-50/50">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
                            <img src={item.image_url || "/placeholder.png"} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black italic text-gray-900">{item.product_name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">QTY: {item.quantity} · SIZE: {item.size_value || "STD"}</p>
                          </div>
                          <p className="text-xs font-black italic">₱{(Number(item.price_at_purchase ?? 0) * Number(item.quantity ?? 0)).toLocaleString()}</p>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-xl font-black italic text-primary pt-6 border-t border-gray-50">
                        <span>Total Investment</span>
                        <span>₱{Number(selectedOrder.total_amount ?? 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* History */}
                    {(selectedOrder.history ?? []).length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 italic">Lifecycle Trail</h3>
                        <ul className="space-y-2">
                          {selectedOrder.history.map((h: any, idx: number) => (
                            <li key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-gray-50/50">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{h.status}</span>
                              <span className="text-[9px] font-bold text-gray-400">{new Date(h.date_updated).toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-12 border-t border-gray-50 bg-gray-50/50 flex justify-end">
                <button onClick={() => window.print()} className="flex items-center gap-3 px-8 py-5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                  Print Manifesto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
