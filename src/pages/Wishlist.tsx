import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Heart, Loader2, HeartOff } from "lucide-react";
import { apiService } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { readWishlist, removeFromWishlist } from "@/utils/wishlist";
import { toast } from "sonner";

export function Wishlist() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    const ids = readWishlist();
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await apiService.getProduct(id);
            return response.status === "success" ? response.data : null;
          } catch {
            return null;
          }
        })
      );
      setProducts(results.filter((p) => p && (p.product_id ?? p.id)));
    } catch {
      setError("Could not load your wishlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const remove = async (productId: number) => {
    removeFromWishlist(Number(productId));
    setProducts((prev) => prev.filter((p) => Number(p.product_id ?? p.id) !== Number(productId)));
    toast.success("Removed from wishlist");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-gray-50 p-12 rounded-[3rem] border border-gray-100">
          <h2 className="text-2xl font-black italic mb-4">Wishlist unavailable</h2>
          <p className="text-gray-500 font-medium mb-8">{error}</p>
          <button
            onClick={fetchWishlist}
            className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-gray-50 p-12 rounded-[3rem] border border-gray-100">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
            <Heart className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 italic tracking-tight">Your Wishlist is Empty</h2>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed">
            Tap the heart on any artifact to save it here. Your wishlist is stored on this device for now.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            Start Exploring
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-3">Saved for Later</div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight italic">Heritage <span className="text-primary underline underline-offset-8">Wishlist</span></h1>
          </div>
          <p className="text-gray-400 font-bold text-sm hidden md:block italic">{products.length} saved artifacts</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const productId = Number(product.product_id ?? product.id);
            return (
              <div key={productId} className="relative group/wish">
                <ProductCard product={product} />
                <button
                  onClick={() => remove(productId)}
                  title="Remove from wishlist"
                  className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all opacity-0 group-hover/wish:opacity-100 focus:opacity-100"
                >
                  <HeartOff className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
