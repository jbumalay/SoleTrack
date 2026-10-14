import { Link } from "react-router";
import { Store, MapPin, Package } from "lucide-react";

interface StoreCardProps {
  store: {
    user_id: number;
    brand_name: string;
    description?: string;
    logo_url?: string;
    location?: string;
    product_count: number;
  };
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Link to={`/store/${store.user_id}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col">
        <div className="aspect-[3/2] bg-gray-50 overflow-hidden flex items-center justify-center">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.brand_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <Store className="w-16 h-16 text-gray-300" />
          )}
        </div>
        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-lg font-black italic tracking-tight text-gray-900 group-hover:text-primary transition-colors mb-2">
            {store.brand_name}
          </h3>
          {store.description && (
            <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2 mb-4 flex-1">
              {store.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {store.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> {store.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Package className="w-3 h-3" /> {store.product_count} Products
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}