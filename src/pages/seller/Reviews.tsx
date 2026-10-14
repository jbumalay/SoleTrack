import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { motion, AnimatePresence } from "motion/react";
import { Star, MessageSquare, Package, ChevronRight, Inbox, Reply, Send, Pencil, Trash2 } from "lucide-react";
import { normalizeList } from "@/utils/normalizeList";
import { getReviewReply, saveReviewReply, deleteReviewReply, ReviewReply } from "@/utils/reviewReplies";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= Math.round(rating) ? "fill-primary text-primary" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </div>
  );
}

export default function SellerReviews() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<number, ReviewReply | null>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<number, boolean>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await apiService.getSellerProducts();
        if (res.status === "success") {
          const list = normalizeList(res.data) ?? [];
          const withReviews = list.filter((p: any) => Number(p.total_reviews) > 0);
          const rest = list.filter((p: any) => Number(p.total_reviews) === 0);
          setProducts([...withReviews, ...rest]);
          if (withReviews.length > 0) selectProduct(withReviews[0]);
        }
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  async function selectProduct(product: any) {
    setSelectedProduct(product);
    setLoadingReviews(true);
    try {
      const res = await apiService.getSellerProductReviews(product.product_id);
      if (res.status === "success") {
        const list = normalizeList(res.data) ?? [];
        setReviews(list);
        const map: Record<number, ReviewReply | null> = {};
        list.forEach((r: any) => { map[r.review_id] = getReviewReply(r.review_id); });
        setReplies(map);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }

  const submitReply = (reviewId: number) => {
    const draft = (replyDrafts[reviewId] ?? "").trim();
    if (!draft) {
      toast.error("Reply cannot be empty");
      return;
    }
    if (draft.length > 1000) {
      toast.error("Reply is too long");
      return;
    }
    const entry = saveReviewReply(reviewId, draft, user?.brand_name || user?.username);
    setReplies(prev => ({ ...prev, [reviewId]: entry }));
    setReplyDrafts(prev => ({ ...prev, [reviewId]: "" }));
    setReplyOpen(prev => ({ ...prev, [reviewId]: false }));
    toast.success("Reply published");
  };

  const removeReply = (reviewId: number) => {
    if (!window.confirm("Remove your reply to this review?")) return;
    deleteReviewReply(reviewId);
    setReplies(prev => ({ ...prev, [reviewId]: null }));
    toast.success("Reply removed");
  };

  const avgRating = selectedProduct ? Number(selectedProduct.average_rating) || 0 : 0;
  const totalReviews = selectedProduct ? Number(selectedProduct.total_reviews) || 0 : 0;

  const ratingBuckets = [5, 4, 3, 2, 1].map((n) => ({
    star: n,
    count: (Array.isArray(reviews) ? reviews : []).filter((r) => Math.round(Number(r.rating)) === n).length,
  }));

  return (
    <div className="p-10 lg:p-20 space-y-16 max-w-[120rem] mx-auto">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Customer Feedback</span>
        <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic mt-2">
          Patron <span className="text-primary underline underline-offset-8 decoration-4">Reviews</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Product list */}
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Artifacts</p>
          </div>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-gray-300">
              <Package size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest">No products yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {products.map((p) => {
                const isActive = selectedProduct?.product_id === p.product_id;
                const reviewCount = Number(p.total_reviews) || 0;
                const avg = Number(p.average_rating) || 0;
                return (
                  <li key={p.product_id}>
                    <button
                      onClick={() => selectProduct(p)}
                      className={`w-full flex items-center gap-4 px-8 py-5 text-left transition-colors ${isActive ? "bg-primary/5" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                        <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black italic truncate ${isActive ? "text-primary" : "text-gray-900"}`}>
                          {p.product_name}
                        </p>
                        {reviewCount > 0 ? (
                          <div className="flex items-center gap-2 mt-1">
                            <StarDisplay rating={avg} />
                            <span className="text-[9px] font-black text-gray-400">{reviewCount}</span>
                          </div>
                        ) : (
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1">No reviews</p>
                        )}
                      </div>
                      <ChevronRight size={14} className={isActive ? "text-primary" : "text-gray-200"} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Reviews panel */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedProduct ? (
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center py-32 gap-4 text-gray-300">
              <MessageSquare size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest">Select a product to view reviews</p>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gray-100 shrink-0">
                    <img src={selectedProduct.image_url} alt={selectedProduct.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Viewing reviews for</p>
                    <h2 className="text-2xl font-black italic tracking-tight text-gray-900 mt-1">{selectedProduct.product_name}</h2>
                  </div>
                  <div className="flex flex-col items-center gap-2 bg-gray-50 rounded-3xl px-10 py-6 shrink-0">
                    <span className="text-5xl font-black italic text-gray-900">
                      {totalReviews > 0 ? avgRating.toFixed(1) : "—"}
                    </span>
                    <StarDisplay rating={avgRating} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>

                {totalReviews > 0 && (
                  <div className="mt-8 space-y-3">
                    {ratingBuckets.map(({ star, count }) => (
                      <div key={star} className="flex items-center gap-4">
                        <div className="flex items-center gap-1 w-16 shrink-0">
                          <span className="text-[10px] font-black text-gray-500">{star}</span>
                          <Star size={10} className="fill-primary text-primary" />
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-700"
                            style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Individual reviews */}
              {loadingReviews ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-4 text-gray-300">
                  <Inbox size={36} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No reviews yet for this product</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedProduct.product_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="space-y-4"
                  >
                    {reviews.map((review) => (
                      <div
                        key={review.review_id}
                        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-primary">
                                {(review.customer_name || "A")[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-black italic text-gray-900">{review.customer_name || "Anonymous"}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(review.created_at ?? Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <StarDisplay rating={Number(review.rating)} />
                        </div>
                        {review.comment && (
                          <p className="mt-5 text-sm text-gray-600 leading-relaxed italic pl-14">
                            "{review.comment}"
                          </p>
                        )}

                        {/* Seller reply */}
                        {replies[review.review_id] ? (
                          <div className="mt-5 ml-14 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Reply size={12} /> {replies[review.review_id]?.seller_name || "Seller"} replied
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setReplyDrafts(prev => ({ ...prev, [review.review_id]: replies[review.review_id]?.reply ?? "" }));
                                    setReplyOpen(prev => ({ ...prev, [review.review_id]: true }));
                                  }}
                                  title="Edit reply"
                                  className="p-2 text-gray-400 hover:text-primary rounded-lg transition-colors border border-gray-100 bg-white"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => removeReply(review.review_id)}
                                  title="Remove reply"
                                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors border border-gray-100 bg-white"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed italic">{replies[review.review_id]?.reply}</p>
                          </div>
                        ) : replyOpen[review.review_id] ? (
                          <div className="mt-5 ml-14 space-y-3">
                            <textarea
                              value={replyDrafts[review.review_id] ?? ""}
                              onChange={(e) => setReplyDrafts(prev => ({ ...prev, [review.review_id]: e.target.value }))}
                              rows={3}
                              placeholder="Write your artisan reply..."
                              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-medium focus:border-primary outline-none transition-all"
                            />
                            <div className="flex gap-3">
                              <button
                                onClick={() => submitReply(review.review_id)}
                                className="px-8 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2"
                              >
                                <Send size={12} /> Publish Reply
                              </button>
                              <button
                                onClick={() => setReplyOpen(prev => ({ ...prev, [review.review_id]: false }))}
                                className="px-8 py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyOpen(prev => ({ ...prev, [review.review_id]: true }))}
                            className="mt-5 ml-14 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4"
                          >
                            <Reply size={12} /> Reply to this review
                          </button>
                        )}
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
