import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Trash2, ShoppingBag, ArrowRight, ChevronLeft, CreditCard, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiService } from "@/services/api";
import { CartItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/constants";
import { readGuestCart, updateGuestCartLine, removeGuestCartLine } from "@/utils/guestCart";
import { toast } from "sonner";

export function Cart() {
  const navigate = useNavigate();
  const { refreshCart, refreshCartCount, user, isAdmin, isSeller, loading: authLoading } = useAuth();
  const isGuest = !user;
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) { navigate("/admin"); return; }
    if (isSeller) { navigate("/seller"); return; }
  }, [authLoading, isAdmin, isSeller, navigate]);

  const fetchCart = async () => {
    try {
      if (isGuest) {
        setCartItems(readGuestCart() as unknown as CartItem[]);
        return;
      }
      const response = await apiService.getCart();
      if (response.status === "success") {
        setCartItems((response.data.items as CartItem[] | undefined) ?? []);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch cart";
      if (message.includes("401") || message.toLowerCase().includes("unauthor")) setAuthError(true);
      else toast.error(message);
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const updateQuantity = async (id: number, newQuantity: number) => {
    const quantity = Math.floor(Number(newQuantity));
    if (isNaN(quantity) || quantity < 1) return;
    setUpdatingItems(prev => ({ ...prev, [id]: true }));
    try {
      if (isGuest) {
        setCartItems(updateGuestCartLine(String(id), quantity) as unknown as CartItem[]);
        refreshCartCount();
      } else {
        await apiService.updateCartItem(id, quantity);
        await fetchCart();
        await refreshCart();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update quantity");
      console.error("Failed to update quantity:", error);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [id]: false }));
    }
  };

  const removeItem = async (id: number) => {
    setUpdatingItems(prev => ({ ...prev, [id]: true }));
    try {
      if (isGuest) {
        setCartItems(removeGuestCartLine(String(id)) as unknown as CartItem[]);
        refreshCartCount();
      } else {
        await apiService.removeCartItem(id);
        await fetchCart();
        await refreshCart();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove item");
      console.error("Failed to remove cart item:", error);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [id]: false }));
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const shipping = subtotal > SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-gray-50 p-12 rounded-[3rem] border border-gray-100">
          <h2 className="text-2xl font-black italic mb-4">Please log in</h2>
          <p className="text-gray-500 font-medium mb-8">Your heritage cart is waiting. Log in to continue.</p>
          <Link to="/login?redirect=%2Fcart" className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md bg-gray-50 p-12 rounded-[3rem] border border-gray-100"
        >
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
             <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 italic tracking-tight">Your Cart is a Blank Canvas</h2>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">It seems your heritage journey hasn't started yet. Let's find something unique for you.</p>
          <Link 
            to="/products"
            className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            Start Exploring
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-12">
           <div>
              <div className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-3">Your Selection</div>
              <h1 className="text-5xl font-black text-gray-900 tracking-tight italic">Heritage <span className="text-primary underline underline-offset-8">Cart</span></h1>
           </div>
           <p className="text-gray-400 font-bold text-sm hidden md:block italic">{cartItems.length} Unique items selected</p>
        </div>

        {isGuest && (
          <div className="mb-10 bg-primary/5 border border-primary/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold text-gray-600 leading-relaxed">
              You're browsing as a guest. Your cart is saved on this device and merges into your account when you log in.
            </p>
            <Link
              to="/login?redirect=%2Fcheckout"
              className="shrink-0 inline-flex items-center justify-center bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary transition-all shadow-xl shadow-gray-200"
            >
              Log in to check out
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 xl:gap-16">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {cartItems.map((item, index) => (
                <motion.div 
                  key={item.cart_item_id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row gap-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="w-full sm:w-40 aspect-square rounded-[2rem] overflow-hidden bg-gray-50 flex-shrink-0 relative">
                    <Link to={`/product/${item.product_id}`}>
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </Link>
                  </div>
                  
                  <div className="flex-1 flex flex-col py-2">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        {/* No category in cart items by default, so we can skip or use product_id */}
                        <div className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Authentic Gear</div>
                        <Link to={`/product/${item.product_id}`} className="font-black text-2xl text-gray-900 italic tracking-tight hover:text-primary transition-colors">{item.name}</Link>
                        <div className="flex gap-4 mt-2">
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{Number(item.price) > 1000 ? "Premium" : "Standard"}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeItem(item.cart_item_id)}
                        disabled={updatingItems[item.cart_item_id]}
                        className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all disabled:opacity-30"
                      >
                        {updatingItems[item.cart_item_id] ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, Number(item.quantity) - 1)}
                          disabled={updatingItems[item.cart_item_id] || Number(item.quantity) <= 1}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-100 font-bold flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                        >-</button>
                        <span className="w-8 text-center font-black text-sm italic">
                          {updatingItems[item.cart_item_id] ? "..." : item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, Number(item.quantity) + 1)}
                          disabled={updatingItems[item.cart_item_id] || (item.stock_quantity !== undefined && Number(item.quantity) >= item.stock_quantity)}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-100 font-bold flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                        >+</button>
                      </div>
                      <div className="text-2xl font-black text-gray-900">
                        ₱{(Number(item.price) * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <Link 
              to="/products"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors pt-4 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Continue Shopping
            </Link>
          </div>

          <div className="lg:col-span-1">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-2xl shadow-gray-200/50"
            >
              <h2 className="text-2xl font-black mb-8 italic tracking-tight">Order <span className="text-primary italic underline underline-offset-4 decoration-2">Manifest</span></h2>
              
              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Subtotal</span>
                  <span className="font-black text-xl text-gray-900">₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Estimate Shipping</span>
                  <span className={`font-black text-sm ${shipping === 0 ? "text-green-500 uppercase tracking-widest italic" : "text-gray-900"}`}>
                    {shipping === 0 ? "Complimentary" : `₱${shipping.toFixed(0)}`}
                  </span>
                </div>
                {subtotal < SHIPPING_THRESHOLD && (
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                    <p className="text-[10px] leading-relaxed text-orange-800 font-bold uppercase tracking-wider">
                      💡 Add <span className="text-orange-950">₱{(SHIPPING_THRESHOLD - subtotal).toFixed(0)}</span> for complimentary Bicol delivery.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-8 mb-10">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Final Total</span>
                  <span className="text-4xl font-black text-gray-900 italic">₱{total.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => (isGuest ? navigate("/login?redirect=%2Fcheckout") : navigate("/checkout"))}
                className="w-full bg-primary text-white py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 flex items-center justify-center group active:scale-95"
              >
                {isGuest ? "Log in to Checkout" : "Proceed to Checkout"}
                <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="mt-8 flex items-center justify-center gap-2">
                 <CreditCard className="w-4 h-4 text-gray-300" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Secure Heritage Payments</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
