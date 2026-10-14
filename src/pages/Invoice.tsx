import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { ChevronLeft, Loader2, Printer } from "lucide-react";
import { apiService } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function Invoice() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiService.getOrderDetails(Number(id));
        if (response.status === "success") setOrder(response.data);
      } catch (error) {
        console.error("Failed to fetch order:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-black italic mb-4">Invoice Not Found</h1>
          <p className="text-gray-500 mb-8">We couldn't find this order.</p>
          <Link to="/account" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-black italic shadow-xl shadow-primary/20">
            <ChevronLeft size={20} /> Back to Account
          </Link>
        </div>
      </div>
    );
  }

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price_at_purchase ?? 0) * Number(item.quantity ?? 0),
    0
  );
  const shipping = Number(order.shipping_fee ?? 0);
  const total = Number(order.total_amount ?? subtotal + shipping);

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors group"
          >
            <div className="bg-white p-2 rounded-lg border border-gray-100 group-hover:bg-gray-100 transition-colors">
              <ChevronLeft size={14} />
            </div>
            Back to Account
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200"
          >
            <Printer size={14} /> Print Invoice
          </button>
        </div>

        <div className="print-manifest bg-white rounded-[3rem] border border-gray-100 shadow-sm p-12">
          {/* Invoice header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <p className="text-3xl font-black italic tracking-tighter text-gray-900">Sole<span className="text-primary">Track</span></p>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Heritage Collective</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice</p>
              <p className="text-xl font-black italic text-gray-900">#ORD-{String(order.order_id).padStart(5, "0")}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {order.order_date ? new Date(order.order_date).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          {/* Billed to */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Billed To</p>
              <p className="text-sm font-black italic text-gray-900">
                {user?.first_name || user?.last_name ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() : user?.username}
              </p>
              <p className="text-xs font-bold text-gray-500">{user?.email}</p>
              <p className="text-xs font-bold text-gray-600 leading-relaxed mt-2 max-w-xs">{order.shipping_address}</p>
            </div>
            <div className="md:text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Order Status</p>
              <p className="text-sm font-black italic text-gray-900 uppercase tracking-widest">{order.order_status}</p>
              {order.payment_method && (
                <>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 mt-6">Payment Method</p>
                  <p className="text-sm font-black italic text-gray-900 uppercase tracking-widest">{order.payment_method}</p>
                </>
              )}
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-left mb-12">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Artifact</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Size</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Qty</th>
                <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-4 text-xs font-black italic text-gray-900">{item.product_name}</td>
                  <td className="py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.size_value || "Std"}</td>
                  <td className="py-4 text-center text-[10px] font-bold text-gray-500">{item.quantity}</td>
                  <td className="py-4 text-right text-xs font-black italic text-gray-900">
                    ₱{(Number(item.price_at_purchase ?? 0) * Number(item.quantity ?? 0)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtotal</span>
                <span className="text-xs font-black">₱{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shipping</span>
                <span className="text-xs font-black">{shipping === 0 ? "FREE" : `₱${shipping.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total</span>
                <span className="text-2xl font-black italic text-gray-900">₱{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="mt-16 text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center leading-relaxed">
            Thank you for supporting Bicol craftsmanship<br />
            SoleTrack Heritage Collective · demo invoice
          </p>
        </div>
      </div>
    </div>
  );
}
