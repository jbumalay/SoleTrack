import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { CreditCard, Banknote, CheckCircle2, ShieldCheck, ArrowLeft, ChevronLeft, Loader2, MapPin, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiService } from "@/services/api";
import { CartItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/constants";
import { getSavedAddresses, saveAddress, newAddressId, addressToSnapshot, addressLine, SavedAddress } from "@/utils/addresses";
import { toast } from "sonner";

export function Checkout() {
  const navigate = useNavigate();
  const { refreshCart, isAdmin, isSeller, loading: authLoading, user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) { navigate("/admin"); return; }
    if (isSeller) { navigate("/seller"); return; }
  }, [authLoading, isAdmin, isSeller, navigate]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<"cod" | "gcash" | "paymaya" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderSummary, setOrderSummary] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [promoCode, setPromoCode] = useState("");

  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    zipCode: ""
  });

  useEffect(() => {
    async function fetchCart() {
      setLoading(true);
      try {
        const response = await apiService.getCart();
        if (response.status === "success") {
          setCartItems((response.data.items as CartItem[] | undefined) ?? []);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch cart";
        if (message.includes("401") || message.toLowerCase().includes("unauthor")) {
          navigate("/login?redirect=%2Fcheckout");
          return;
        }
        toast.error(message);
        console.error("Failed to fetch cart:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCart();
  }, [navigate]);

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const shipping = subtotal > SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  useEffect(() => {
    const saved = getSavedAddresses();
    setSavedAddresses(saved);
    if (saved.length > 0) setSelectedAddressId(saved[0].id);
    if (user?.email) setShippingInfo(prev => ({ ...prev, email: user.email }));
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value });
  };

  const usingSavedAddress = savedAddresses.length > 0 && selectedAddressId !== "new";
  const selectedAddress = usingSavedAddress
    ? savedAddresses.find((a) => a.id === selectedAddressId) ?? null
    : null;

  const handlePlaceOrder = async () => {
    if (!selectedPayment) {
      toast.error("Please select a payment method");
      return;
    }
    let shippingAddress: string;
    if (selectedAddress) {
      shippingAddress = addressToSnapshot(selectedAddress);
    } else {
      const requiredFields = ["fullName", "email", "phone", "address", "city", "province", "zipCode"];
      const missingFields = requiredFields.filter(field => !shippingInfo[field as keyof typeof shippingInfo]);
      if (missingFields.length > 0) {
        toast.error("Please fill in all shipping information fields");
        return;
      }
      shippingAddress = `${shippingInfo.fullName}, ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.province}, ${shippingInfo.zipCode}. Phone: ${shippingInfo.phone}`;
      if (saveNewAddress && newAddressLabel.trim()) {
        saveAddress({
          id: newAddressId(),
          label: newAddressLabel.trim(),
          full_name: shippingInfo.fullName,
          phone: shippingInfo.phone,
          address: shippingInfo.address,
          city: shippingInfo.city,
          province: shippingInfo.province,
          zip_code: shippingInfo.zipCode,
          email: shippingInfo.email,
        });
      }
    }

    setIsProcessing(true);
    try {
      const code = promoCode.trim();
      const response = await apiService.checkout({
        shipping_address: shippingAddress,
        payment_method: selectedPayment,
        ...(code ? { promo_code: code } : {}),
      });

      if (response.status === "success" || response.status === "created") {
        setOrderId(response.data.order_id);
        setOrderSummary(response.data);
        setOrderComplete(true);
        await refreshCart();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (cartItems.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 text-center">
        <div>
          <h2 className="text-2xl font-black mb-4">Your cart is empty</h2>
          <button onClick={() => navigate("/products")} className="text-primary font-bold underline">Go back to products</button>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl text-gray-900 border border-gray-100"
        >
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-3xl font-black mb-4 tracking-tight italic">Order Confirmed!</h2>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">
            Thank you for supporting Bicol craftsmanship. We've sent your artisan receipt to <span className="text-gray-900 font-bold">{shippingInfo.email}</span>.
          </p>
            <div className="bg-gray-50 rounded-3xl p-8 mb-10 text-left space-y-4">
            <div className="flex justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtotal</span>
              <span className="text-xs font-black">₱{(orderSummary?.subtotal || subtotal).toLocaleString()}</span>
            </div>
            {orderSummary?.discount ? (
              <div className="flex justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Voucher {orderSummary?.promo_code ? `(${orderSummary.promo_code})` : ""}</span>
                <span className="text-xs font-black">−₱{Number(orderSummary.discount).toLocaleString()}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Artisan Delivery</span>
              <span className="text-xs font-black">{orderSummary ? (orderSummary.shipping === 0 ? "FREE" : `₱${orderSummary.shipping}`) : (shipping === 0 ? "FREE" : `₱${shipping}`)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Investment</span>
              <span className="text-xs font-black">₱{(orderSummary?.total || total).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Method</span>
              <span className="text-xs font-black uppercase">{selectedPayment}</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            Return to Store
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
           <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors group mb-8"
            >
              <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-gray-50 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </div>
              Cancel Checkout
            </button>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight italic mb-4">Secure <span className="text-primary underline underline-offset-8">Checkout</span></h1>
            
            <div className="flex gap-4">
               {[1, 2].map(i => (
                 <div key={i} className={`flex items-center gap-2 ${step >= i ? 'text-primary' : 'text-gray-300'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${step >= i ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>{i}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{i === 1 ? 'Shipping' : 'Payment'}</span>
                    {i === 1 && <div className="w-8 h-[2px] bg-gray-200 mx-2" />}
                 </div>
               ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 xl:gap-16">
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100"
                >
                  <h2 className="text-2xl font-black mb-8 italic tracking-tight">Delivery <span className="text-primary">Details</span></h2>

                  {savedAddresses.length > 0 && (
                    <div className="mb-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saved Addresses</p>
                        <Link to="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4">Manage</Link>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedAddresses.map((address) => (
                          <button
                            key={address.id}
                            type="button"
                            onClick={() => setSelectedAddressId(address.id)}
                            className={`text-left p-6 rounded-3xl border-2 transition-all ${
                              selectedAddressId === address.id
                                ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                                : "border-gray-100 bg-white hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black italic text-gray-900 flex items-center gap-2">
                                <MapPin size={14} className="text-primary" /> {address.label}
                              </span>
                              {selectedAddressId === address.id && <CheckCircle2 size={16} className="text-primary" />}
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{address.full_name} · {address.phone}</p>
                            <p className="text-xs font-bold text-gray-600 mt-1 leading-relaxed">{addressLine(address)}</p>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSelectedAddressId("new")}
                          className={`text-left p-6 rounded-3xl border-2 border-dashed transition-all flex items-center gap-4 ${
                            selectedAddressId === "new"
                              ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedAddressId === "new" ? "bg-primary text-white" : "bg-gray-50 text-gray-400"}`}>
                            <Plus size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black italic text-gray-900">Use a new address</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Enter a different destination</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {!usingSavedAddress && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <InputLabel>Full Artisan Name</InputLabel>
                          <CheckoutInput name="fullName" value={shippingInfo.fullName} onChange={handleInputChange} placeholder="Juan Dela Cruz" />
                        </div>
                        <div>
                          <InputLabel>Artisan Email</InputLabel>
                          <CheckoutInput type="email" name="email" value={shippingInfo.email} onChange={handleInputChange} placeholder="email@address.com" />
                        </div>
                        <div>
                          <InputLabel>Phone Identity</InputLabel>
                          <CheckoutInput type="tel" name="phone" value={shippingInfo.phone} onChange={handleInputChange} placeholder="09XX XXX XXXX" />
                        </div>
                        <div className="md:col-span-2">
                          <InputLabel>Heritage Address</InputLabel>
                          <textarea
                            name="address"
                            value={shippingInfo.address}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-6 py-4 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm"
                            placeholder="House No., Street, Barangay"
                          />
                        </div>
                        <div>
                          <InputLabel>City / Municipality</InputLabel>
                          <CheckoutInput name="city" value={shippingInfo.city} onChange={handleInputChange} placeholder="Legazpi City" />
                        </div>
                        <div>
                          <InputLabel>Province</InputLabel>
                          <CheckoutInput name="province" value={shippingInfo.province} onChange={handleInputChange} placeholder="Albay" />
                        </div>
                        <div>
                          <InputLabel>Zip Code</InputLabel>
                          <CheckoutInput name="zipCode" value={shippingInfo.zipCode} onChange={handleInputChange} placeholder="4501" />
                        </div>
                      </div>

                      <label className="mt-8 flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveNewAddress}
                          onChange={(e) => setSaveNewAddress(e.target.checked)}
                          className="w-5 h-5 rounded-md border-gray-200 text-primary focus:ring-primary"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Save this address to my address book</span>
                      </label>
                      {saveNewAddress && (
                        <div className="mt-4">
                          <InputLabel>Address Label</InputLabel>
                          <CheckoutInput value={newAddressLabel} onChange={(e) => setNewAddressLabel(e.target.value)} placeholder="Home / Studio / Parents" />
                        </div>
                      )}
                    </>
                  )}

                  <button 
                    onClick={() => setStep(2)}
                    className="w-full mt-10 bg-gray-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                  >
                    Set Payment Method
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100"
                >
                   <h2 className="text-2xl font-black mb-8 italic tracking-tight">Payment <span className="text-primary">Selection</span></h2>
                   <div className="space-y-4">
                      <PaymentCard 
                        id="cod" title="Cash on Delivery" icon={<Banknote className="w-6 h-6" />}
                        selected={selectedPayment === "cod"} onClick={() => setSelectedPayment("cod")}
                        desc="Pay artisan upon arrival"
                      />
                      <PaymentCard 
                        id="gcash" title="GCash Digital" icon={<CreditCard className="w-6 h-6" />}
                        selected={selectedPayment === "gcash"} onClick={() => setSelectedPayment("gcash")}
                        desc="Instant secure Bicol transfer"
                      />
                      <PaymentCard 
                        id="paymaya" title="PayMaya Pay" icon={<CreditCard className="w-6 h-6" />}
                        selected={selectedPayment === "paymaya"} onClick={() => setSelectedPayment("paymaya")}
                        desc="National digital payment"
                      />
                   </div>
                   <div className="flex gap-4 mt-10">
                      <button 
                        onClick={() => setStep(1)}
                        className="flex-1 bg-gray-50 text-gray-400 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                      >
                         Back to Shipping
                      </button>
                      <button 
                        onClick={handlePlaceOrder}
                        disabled={!selectedPayment || isProcessing}
                        className="flex-[2] bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none"
                      >
                         {isProcessing ? "Processing Artistry..." : "Confirm Final Order"}
                      </button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-900 text-white rounded-[3rem] p-10 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />
              <h2 className="text-2xl font-black mb-8 italic tracking-tight relative z-10">Final Summary</h2>
              
              <div className="space-y-6 mb-8 relative z-10">
                {cartItems.map(item => (
                  <div key={item.cart_item_id} className="flex gap-4 items-center group">
                    <Link to={`/product/${item.product_id}`} className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${item.product_id}`} className="text-sm font-black italic truncate mb-1 hover:text-primary transition-colors block">{item.name}</Link>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">ARTISAN GEAR • {item.quantity} Pair(s)</p>
                    </div>
                    <div className="text-sm font-black italic">₱{Number(item.price).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-8 border-t border-white/10 relative z-10">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Voucher code</label>
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="WELCOME10"
                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-sm placeholder:text-gray-600 focus:border-primary transition-all uppercase"
                  />
                </div>
                <div className="flex justify-between items-center text-gray-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                  <span className="text-xs font-black italic text-white">₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">Delivery</span>
                  <span className="text-xs font-black italic text-white">{shipping === 0 ? "FREE" : `₱${shipping}`}</span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Final Amount</span>
                  <span className="text-4xl font-black italic">₱{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/10 text-center relative z-10">
                 <div className="flex items-center justify-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Encrypted Heritage Transmission</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">{children}</label>;
}

function CheckoutInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      {...props}
      className={`w-full px-6 py-4 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm ${className || ''}`}
    />
  );
}

function PaymentCard({ title, icon, selected, onClick, desc }: { id: string, title: string, icon: React.ReactNode, selected: boolean, onClick: () => void, desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-6 p-6 rounded-3xl border-2 transition-all text-left group ${
        selected ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' : 'border-gray-100 hover:border-gray-300 bg-white'
      }`}
    >
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
         selected ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:text-gray-600'
       }`}>
         {icon}
       </div>
       <div className="flex-1">
          <h4 className={`font-black italic text-lg leading-tight transition-colors ${selected ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{desc}</p>
       </div>
       <div className={`w-6 h-6 rounded-full border-2 p-1 transition-all ${selected ? 'border-primary' : 'border-gray-200'}`}>
          {selected && <div className="w-full h-full bg-primary rounded-full" />}
       </div>
    </button>
  );
}
