import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import { StoreCard } from "../components/StoreCard";
import { Store, Search } from "lucide-react";

export function Stores() {
  const [stores, setStores] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiService.getStores().then((res) => {
      if (res.status === "success") {
        setStores(res.data);
        setFiltered(res.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(stores);
    } else {
      const q = search.toLowerCase();
      setFiltered(stores.filter((s) => s.brand_name?.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q)));
    }
  }, [search, stores]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter mb-4">
            Artisan <span className="text-primary">Stores.</span>
          </h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest max-w-md mx-auto">
            Discover the master artisans behind every pair
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores by name or location..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No stores found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((store) => (
              <StoreCard key={store.user_id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}