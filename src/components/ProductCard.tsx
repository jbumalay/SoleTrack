import { Link, useNavigate } from "react-router";
import { Star, TrendingUp } from "lucide-react";
import { Product } from "@/types";
import { LOW_STOCK_THRESHOLD } from "@/constants";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const productId = product.product_id;
  const productName = product.product_name || product.name;
  const productPrice = Number(product.base_price || product.price);
  const productImage = product.image_url || product.image;
  const productCategory = product.category_name || product.category;
  const productStock = product.total_stock !== undefined ? Number(product.total_stock) : (product.stock_quantity !== undefined ? Number(product.stock_quantity) : 0);

  const getStockStatus = () => {
    if (productStock <= 0) return { label: "Out of Stock", color: "bg-red-500" };
    if (productStock < 10) return { label: "Low Stock", color: "bg-orange-500" };
    if (productStock < LOW_STOCK_THRESHOLD) return { label: "Limited Stock", color: "bg-yellow-500" };
    return { label: "In Stock", color: "bg-green-500" };
  };

  const stockStatus = getStockStatus();

  return (
    <Link to={`/product/${productId}`} className="group">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
        <div className="aspect-square overflow-hidden bg-gray-50 relative">
          <img
            src={productImage}
            alt={productName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className={`absolute top-3 right-3 ${stockStatus.color} text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            {stockStatus.label}
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1.5 flex justify-between items-center">
            <span>{productCategory}</span>
            <span className="text-gray-400 font-medium italic lowercase tracking-tight">by
              {product.seller_id ? (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/store/${product.seller_id}`); }}
                  className="hover:text-primary transition-colors ml-0.5"
                >{product.brand_name}</button>
              ) : (
                <span className="ml-0.5">{product.brand_name}</span>
              )}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 mb-6 line-clamp-1 group-hover:text-primary transition-colors italic tracking-tight">
            {productName}
          </h3>
          <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
            <div>
              <div className="text-xl font-black text-gray-900 italic tracking-tight">₱{productPrice.toLocaleString()}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm group-hover:shadow-primary/20">
              <span className="text-lg font-black">+</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
