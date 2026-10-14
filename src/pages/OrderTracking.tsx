import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  MapPin, 
  ShoppingBag,
  XCircle
} from "lucide-react";
import { apiService } from "../services/api";
import { toast } from "sonner";
import { CancelModal } from "../components/CancelModal";

interface OrderHistoryItem {
  status: string;
  date_updated: string;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  image_url: string;
  quantity: number;
  price_at_purchase: string;
  size_value: string;
}

interface Order {
  order_id: number;
  order_status: string;
  total_amount: string;
  shipping_fee: string;
  shipping_address: string;
  order_date: string;
  items: OrderItem[];
  history: OrderHistoryItem[];
}

const statusConfig: Record<string, { icon: any; color: string; label: string; description: string }> = {
  pending: { 
    icon: Clock, 
    color: "text-amber-500", 
    label: "Order Placed", 
    description: "We've received your order and are waiting for confirmation." 
  },
  confirmed: { 
    icon: ShoppingBag, 
    color: "text-blue-500", 
    label: "Confirmed", 
    description: "Your order has been confirmed by the seller." 
  },
  shipped: { 
    icon: Truck, 
    color: "text-indigo-500", 
    label: "In Transit", 
    description: "Your heritage items are on their way to you." 
  },
  delivered: { 
    icon: CheckCircle2, 
    color: "text-green-500", 
    label: "Delivered", 
    description: "Order completed! Enjoy your Bicolano footwear." 
  },
  cancelled: { 
    icon: Package, 
    color: "text-red-500", 
    label: "Cancelled", 
    description: "This order has been cancelled." 
  }
};

const statusOrder = ["pending", "confirmed", "shipped", "delivered"];

export function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiService.getOrderDetails(Number(id));
        if (response.status === "success") {
          setOrder(response.data);
        }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium font-mono text-xs uppercase tracking-widest">Tracking Heritage...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-black italic mb-4">Order Not Found</h1>
          <p className="text-gray-500 mb-8">We couldn't track this specific order.</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-black italic shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
            <ChevronLeft size={20} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIndex = statusOrder.indexOf(order.order_status);
  const isCancelled = order.order_status === "cancelled";

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-32 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 font-mono text-[10px] font-black uppercase tracking-widest transition-colors group">
            <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-gray-100 transition-colors">
              <ChevronLeft size={14} />
            </div>
            Back to Orders
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {!isCancelled && (
                   <span className="flex items-center gap-1.5 text-xs font-black text-primary italic">
                    <Clock size={12} />
                    Heritage Voyage Commenced {new Date(order.order_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 leading-tight">
                {isCancelled ? "Order Cancelled" : "Order Journey"}
              </h1>
            </div>
              <div className="bg-primary/5 px-6 py-4 rounded-2xl border border-primary/10 flex items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Estimated Arrival</p>
                <p className="text-lg font-black text-primary italic">3-5 Business Days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Journey */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Steps */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100">
              {!isCancelled ? (
                <div className="relative">
                  {statusOrder.map((step, idx) => {
                    const config = statusConfig[step];
                    const isCompleted = idx <= currentStatusIndex;
                    const isActive = idx === currentStatusIndex;
                    const Icon = config.icon;

                    return (
                      <div key={step} className="relative pl-12 pb-12 last:pb-0">
                        {/* Line */}
                        {idx !== statusOrder.length - 1 && (
                          <div className={`absolute left-[11px] top-6 w-[2px] h-full ${idx < currentStatusIndex ? 'bg-primary' : 'bg-gray-100'}`} />
                        )}
                        
                        {/* Dot */}
                        <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                          isCompleted ? 'bg-primary border-primary shadow-lg shadow-primary/30' : 'bg-white border-gray-100'
                        }`}>
                          {isCompleted && <CheckCircle2 size={12} className="text-white" />}
                        </div>

                        <div className={`transition-opacity duration-500 ${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-xl bg-gray-50 ${isActive ? config.color : 'text-gray-400'}`}>
                              <Icon size={18} />
                            </div>
                            <h3 className={`font-black italic text-sm uppercase tracking-tighter ${isActive ? 'text-primary' : 'text-gray-900'}`}>
                              {config.label}
                            </h3>
                          </div>
                          <p className="text-gray-500 text-sm leading-relaxed">{config.description}</p>
                          
                          {/* History Date */}
                          {isCompleted && order.history.some(h => h.status === step) && (
                            <p className="mt-2 font-mono text-[9px] font-black text-gray-400">
                              {new Date(order.history.find(h => h.status === step)!.date_updated).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Package size={64} className="mx-auto text-red-500 mb-6" />
                  <h3 className="text-2xl font-black italic text-gray-900 mb-2">Order Cancelled</h3>
                  <p className="text-gray-500">This order has been cancelled and won't be delivered.</p>
                </div>
              )}
            </div>

            {/* Delivery Details */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
              <h2 className="text-xl font-black italic mb-8 flex items-center gap-3">
                <MapPin className="text-primary" /> Delivery Information
              </h2>
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Shipping Address</p>
                  <p className="text-gray-900 font-medium leading-relaxed">{order.shipping_address}</p>
                </div>
                {order.order_status === 'shipped' && (
                  <div className="flex items-center justify-between p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Carrier</p>
                      <p className="font-black italic text-indigo-900">Bicol Heritage Express</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
              <h2 className="text-lg font-black italic mb-6">Order Summary</h2>
              
              <div className="space-y-6 mb-8">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <Link to={`/product/${item.product_id}`} className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </Link>
                    <div className="flex flex-col justify-center">
                      <Link to={`/product/${item.product_id}`} className="text-xs font-black italic text-gray-900 line-clamp-1 group-hover:text-primary transition-colors hover:text-primary">{item.product_name}</Link>
                      <div className="flex items-center gap-2 mt-1">
                         <p className="text-[10px] font-mono text-gray-500">Size: {item.size_value}</p>
                         <span className="text-[10px] text-gray-300">•</span>
                         <p className="text-[10px] font-mono text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs font-black text-primary mt-1">₱{Number(item.price_at_purchase).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center text-gray-500 font-mono text-[10px] uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>₱{(Number(order.total_amount) - Number(order.shipping_fee || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 font-mono text-[10px] uppercase tracking-widest">
                  <span>Shipping</span>
                  <span className={Number(order.shipping_fee) === 0 ? "text-green-600 font-black" : "font-black"}>
                    {Number(order.shipping_fee) === 0 ? "Free" : `₱${Number(order.shipping_fee).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className="text-sm font-black italic">Total</span>
                  <span className="text-xl font-black text-primary italic">₱{Number(order.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {["pending", "confirmed"].includes(order.order_status) && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black italic text-sm transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-3"
              >
                <XCircle size={20} />
                Cancel Order
              </button>
            )}

            {/* Need Help */}
            <div className="bg-gray-900 rounded-[2rem] p-8 text-white">
              <h3 className="text-lg font-black italic mb-4">Need Help?</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">Our heritage support team is available 24/7 for any concerns regarding your journey.</p>
              <Link to="/contact" className="block w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black italic text-sm transition-all border border-white/10 text-center">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>

      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={async () => {
          try {
            await apiService.cancelOrder(Number(id));
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
