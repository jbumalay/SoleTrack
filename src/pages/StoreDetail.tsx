import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { apiService } from "../services/api";
import { ProductCard } from "../components/ProductCard";
import { Store, MapPin, Mail, Phone, ArrowLeft, Package } from "lucide-react";

export function StoreDetail() {
  const { id } = useParams();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      apiService.getStore(Number(id)).then((res) => {
        if (res.status === "success") setStore(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Store not found</p>
          <Link to="/stores" className="text-primary text-xs font-black uppercase tracking-widest hover:underline">Browse Stores</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Banner */}
      <div className="h-48 sm:h-64 bg-gray-200 overflow-hidden relative">
        {store.banner_url ? (
          <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <Link to="/stores" className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> All Stores
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-20 relative z-10">
        {/* Profile card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-50 p-8 mb-10">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gray-50 overflow-hidden flex-shrink-0 border-4 border-white shadow-lg">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.brand_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="w-10 h-10 text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-black italic tracking-tighter text-gray-900 mb-2">
                {store.brand_name}
              </h1>
              {store.description && (
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-4 max-w-2xl">
                  {store.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {store.location && (
                  <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <MapPin className="w-3 h-3 text-primary" /> {store.location}
                  </span>
                )}
                {store.contact_email && (
                  <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Mail className="w-3 h-3 text-primary" /> {store.contact_email}
                  </span>
                )}
                {store.phone && (
                  <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Phone className="w-3 h-3 text-primary" /> {store.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <Package className="w-3 h-3 text-primary" /> {store.products?.length || 0} Products
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="pb-16">
          <h2 className="text-2xl font-black italic tracking-tighter mb-8">
            <span className="text-primary">Collection</span> by {store.brand_name}
          </h2>
          {(!store.products || store.products.length === 0) ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-50">
              <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No products yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {store.products.map((product: any) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}