import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { Star, Heart, ChevronLeft, Clock, Share2, Loader2, Send, HeartOff } from "lucide-react";
import { apiService } from "@/services/api";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { LOW_STOCK_THRESHOLD } from "@/constants";
import type { ProductInventory } from "@/types";
import { toast } from "sonner";

function readWishlist(): number[] {
  try {
    const raw = localStorage.getItem("soletrack_wishlist") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}

function formatReviewDate(value: unknown): string {
  if (!value) return "Unknown date";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "Unknown date" : d.toLocaleDateString();
}

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshCart, user, isAdmin, isSeller } = useAuth();
  const isShopRole = isAdmin || isSeller;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const numericId = id ? Number(id) : NaN;

  useEffect(() => {
    const wishlist = readWishlist();
    if (id && Number.isFinite(Number(id))) setIsWishlisted(wishlist.includes(Number(id)));
  }, [id]);

  const toggleWishlist = useCallback(() => {
    if (!id || !Number.isFinite(Number(id))) return;
    const wishlist = readWishlist();
    const pid = Number(id);
    try {
      if (wishlist.includes(pid)) {
        const updated = wishlist.filter((x) => x !== pid);
        localStorage.setItem("soletrack_wishlist", JSON.stringify(updated));
        setIsWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        wishlist.push(pid);
        localStorage.setItem("soletrack_wishlist", JSON.stringify(wishlist));
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    } catch {
      toast.error("Could not update wishlist");
    }
  }, [id]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = product?.product_name || "SoleTrack";
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Could not copy link");
      }
    }
  }, [product]);
  const [activeTab, setActiveTab] = useState("description");

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!id || !Number.isFinite(Number(id))) {
      setError("Invalid product identifier.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getProduct(Number(id));
      if (response.status === "success") {
        setProduct(response.data);
      } else {
        setError(response.message || "Product not found.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch product.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast.error("Please select a size to continue your heritage journey.");
      return;
    }
    const productId = product?.product_id ?? product?.id;
    if (productId === undefined || productId === null || !Number.isFinite(Number(productId))) {
      toast.error("This product cannot be added to cart right now.");
      return;
    }

    setIsAdding(true);
    try {
      const response = await apiService.addToCart(Number(productId), quantity, selectedSize);
      if (response.status === "success") {
        await refreshCart();
        navigate("/cart");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to submit a review");
      return;
    }
    const productId = product?.product_id ?? product?.id;
    if (productId === undefined || productId === null || !Number.isFinite(Number(productId))) {
      toast.error("Cannot review this product right now.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await apiService.createReview({
        product_id: Number(productId),
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success("Review submitted! Thank you for your feedback.");
      setReviewComment("");
      // Refresh product to show new review
      const response = await apiService.getProduct(Number(productId));
      if (response.status === "success") setProduct(response.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (error || !product) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md bg-gray-50 p-12 rounded-[3rem] border border-gray-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">Product unavailable</p>
        <h1 className="text-3xl font-black italic tracking-tight text-gray-900 mb-4">Trail Lost.</h1>
        <p className="text-sm text-gray-500 font-medium mb-8">{error || (!Number.isFinite(numericId) ? "Invalid product identifier." : "This product could not be found.")}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={fetchProduct} className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">Retry</button>
          <Link to="/products" className="px-8 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Browse Collection</Link>
        </div>
      </div>
    </div>
  );

  const productStock = product.total_stock !== undefined ? Number(product.total_stock) : (product.stock_quantity !== undefined ? Number(product.stock_quantity) : 0);
  const rawPrice = Number(product.base_price ?? product.price);
  const productPriceLabel = Number.isFinite(rawPrice) ? `₱${rawPrice.toLocaleString()}` : "₱--";
  const productImage = product.image_url || product.image || "/placeholder.png";
  const hasImage = Boolean(product.image_url || product.image);
  const productCategory = product.category_name || product.category;
  const productRating = product.average_rating ? Number(product.average_rating) : 0;
  const productRatingDisplay = Number.isFinite(productRating) && productRating > 0 ? productRating.toFixed(1) : "No ratings";
  const productReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const productSizes: ProductInventory[] = Array.isArray(product.inventory) ? product.inventory : [];
  const selectedInventory = productSizes.find(i => i.size_id === selectedSize);
  const availableStock = selectedInventory ? Number(selectedInventory.stock_quantity) : Number(product.total_stock || 0);

  const stockStatus = (availableStock <= 0)
    ? { label: "Out of Stock", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-100" }
    : (availableStock < LOW_STOCK_THRESHOLD)
    ? { label: "Low Stock", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-100" }
    : { label: "In Stock", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-100" };

  // Single-image catalog: only show gallery affordances when more than one image exists.
  const galleryImages = hasImage ? [productImage] : [];
  const showCarouselDots = galleryImages.length > 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-12">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-gray-50 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </div>
              Back to Collection
            </button>
            <div className="flex gap-2">
               <button onClick={handleShare} className="p-2 border border-gray-100 rounded-full hover:bg-gray-50 transition-all text-gray-400">
                  <Share2 className="w-4 h-4" />
               </button>
               <button onClick={toggleWishlist} className={`p-2 border rounded-full transition-all ${isWishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-100 hover:bg-gray-50 text-gray-400'}`}>
                  {isWishlisted ? <HeartOff className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
               </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="aspect-square rounded-[3rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-2xl relative group">
              {hasImage ? (
                <img
                  src={productImage}
                  alt={product.product_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold uppercase tracking-widest">No image available</div>
              )}
              {showCarouselDots && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
                  {galleryImages.map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-white/50 backdrop-blur-md'}`} />
                  ))}
                </div>
              )}
            </div>

            {showCarouselDots && (
              <div className="grid grid-cols-4 gap-4">
                 {galleryImages.slice(0, 4).map((src, i) => (
                   <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-primary transition-all cursor-pointer">
                      <img src={src} alt="" className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                   </div>
                 ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{productCategory}
                    {product.brand_name && (
                      product.seller_id ? (
                        <> • <Link to={`/store/${product.seller_id}`} className="hover:underline">{product.brand_name}</Link></>
                      ) : (
                        <> • {product.brand_name}</>
                      )
                    )}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${stockStatus.bgColor} ${stockStatus.color} border ${stockStatus.borderColor}`}>
                    {stockStatus.label}
                  </div>
              </div>
              <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6 italic">{product.product_name}</h1>

              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
                {productReviews.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(productRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-black text-gray-900 italic">{productRatingDisplay}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{productReviews.length} Artisan reviews</span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">No rankings yet</span>
                )}
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Heritage Price</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900">{productPriceLabel}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 justify-end mb-1">
                    <Clock className="w-3 h-3" /> Live Inventory
                  </div>
                  <span className="text-sm font-black text-primary italic">
                    {selectedSize ? `${availableStock} pairs in this size` : `${availableStock} unique pairs left`}
                  </span>
                </div>
              </div>

              <div className="space-y-10">
                {/* Color Selection */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Artisan Details</h3>
                  <p className="text-xs text-gray-500 font-medium italic">
                    Handcrafted with care.{' '}
                    {product.seller_id ? (
                      <Link to={`/store/${product.seller_id}`} className="text-primary hover:underline">Visit our store</Link>
                    ) : (
                      'Visit our store for more variants.'
                    )}
                  </p>
                </div>

                {/* Size Selection */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-sans">Select Size (US)</h3>
                    <button type="button" onClick={() => setShowSizeGuide(true)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4">Size Guide</button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {productSizes.map(item => {
                      const isOutOfStock = Number(item.stock_quantity) <= 0;
                      return (
                        <button
                          key={item.inventory_id ?? item.size_id}
                          disabled={isOutOfStock}
                          onClick={() => setSelectedSize(item.size_id)}
                          className={`py-4 rounded-xl border-2 transition-all font-black text-sm relative overflow-hidden ${
                            selectedSize === item.size_id
                              ? 'border-primary bg-primary text-white shadow-xl shadow-primary/20'
                              : isOutOfStock
                              ? 'border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'border-gray-100 hover:border-gray-200 text-gray-900'
                          }`}
                        >
                          {item.size_value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isShopRole && <div className="flex gap-4 sticky bottom-4 z-20 sm:static sm:z-auto mt-auto">
              <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl">
                 <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 font-black text-xl flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                  disabled={availableStock === 0}
                 >-</button>
                 <span className="w-10 text-center font-black italic">{availableStock === 0 ? 0 : quantity}</span>
                 <button
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 font-black text-xl flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                  disabled={availableStock === 0 || quantity >= availableStock}
                 >+</button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={availableStock === 0 || isAdding}
                className={`flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl flex items-center justify-center gap-2 ${
                  availableStock === 0 || isAdding
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                    : "bg-primary text-white hover:bg-primary/90 shadow-primary/30 active:scale-95"
                }`}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : availableStock === 0 ? "Artifact Retired" : "Add to Heritage Cart"}
              </button>
            </div>}

            {/* Product Meta Tabs */}
            <div className="mt-16">
               <div className="flex gap-10 border-b border-gray-100 mb-8 overflow-x-auto whitespace-nowrap">
                  {["description", "reviews"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${
                        activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && <motion.div layoutId="detail-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                    </button>
                  ))}
               </div>

               <div className="min-h-[160px]">
                 <AnimatePresence mode="wait">
                    {activeTab === "description" && (
                      <motion.p
                        key="desc"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-gray-600 leading-relaxed font-medium"
                      >
                        {product.description}
                      </motion.p>
                    )}
                    {activeTab === "reviews" && (
                      <motion.div
                        key="rev"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-12"
                      >
                         {/* Review Submission Form */}
                         {user && !isShopRole && (
                           <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">Submit Your Testimony</h4>
                             <form onSubmit={handleReviewSubmit} className="space-y-6">
                               <div className="flex gap-4">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setReviewRating(star)}
                                      className="p-1"
                                    >
                                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                                    </button>
                                  ))}
                               </div>
                               <textarea
                                 required
                                 value={reviewComment}
                                 onChange={(e) => setReviewComment(e.target.value)}
                                 placeholder="Share your artisan experience..."
                                 className="w-full bg-white border border-gray-100 rounded-2xl p-6 text-sm font-medium focus:border-primary outline-none transition-all min-h-[120px]"
                               />
                               <button
                                 disabled={isSubmittingReview}
                                 type="submit"
                                 className="px-10 py-4 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2"
                               >
                                 {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                 Publish Feedback
                               </button>
                             </form>
                           </div>
                         )}

                         <div className="space-y-8">
                           {productReviews.length > 0 ? (
                              productReviews.map((review: any) => (
                                <div key={review.review_id} className="pb-8 border-b border-gray-50 last:border-0">
                                   <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                            {(review.customer_name || 'A')?.charAt(0)}
                                         </div>
                                         <div>
                                            <div className="text-sm font-black text-gray-900 italic tracking-tight">{review.customer_name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formatReviewDate(review.created_at)}</div>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                                         <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                         <span className="text-[10px] font-black text-yellow-700">{review.rating}</span>
                                      </div>
                                   </div>
                                   <p className="text-sm text-gray-600 font-medium leading-relaxed italic">"{review.comment}"</p>
                                </div>
                              ))
                           ) : (
                              <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                 <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">No artisan reviews yet for this artifact.</p>
                              </div>
                           )}
                         </div>
                      </motion.div>
                    )}
                 </AnimatePresence>
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Size Guide stub modal */}
      <AnimatePresence>
        {showSizeGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowSizeGuide(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-2xl"
            >
              <h3 className="text-lg font-black italic mb-4">US Size Guide</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">Sizes follow standard US mens sizing. If you are between sizes, we recommend sizing up for handcrafted fits.</p>
              <button onClick={() => setShowSizeGuide(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
