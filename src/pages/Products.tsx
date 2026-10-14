import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { SlidersHorizontal, LayoutGrid, X, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { motion, AnimatePresence } from "motion/react";
import { apiService } from "@/services/api";
import { normalizeList } from "@/utils/normalizeList";
import { toast } from "sonner";

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{category_id: number, category_name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const searchQuery = searchParams.get("search") || "";

  // Sync URL -> state (category + search drive state)
  useEffect(() => {
    setSelectedCategory(searchParams.get("category") || "All");
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          apiService.getProducts({ limit: 100 }),
          apiService.getCategories()
        ]);

        if (prodRes.status === "success") setProducts(normalizeList(prodRes.data));
        if (catRes.status === "success") setCategories(normalizeList<{category_id: number, category_name: string}>(catRes.data));
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to load catalog");
        console.error("Failed to fetch products/categories:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const allSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach(p => {
      if (p.inventory) {
        p.inventory.forEach((i: any) => {
          if (i.size_value) sizes.add(i.size_value.toString());
        });
      }
    });
    return Array.from(sizes).sort((a, b) => Number(a) - Number(b));
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.product_name?.toLowerCase().includes(query)) ||
        (p.description?.toLowerCase().includes(query)) ||
        (p.category_name?.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(p => p.category_name === selectedCategory);
    }

    if (selectedSize) {
      filtered = filtered.filter(p =>
        p.inventory?.some((i: any) => i.size_value?.toString() === selectedSize)
      );
    }

    if (inStockOnly) {
      filtered = filtered.filter(p => Number(p.total_stock) > 0);
    }

    filtered = filtered.filter(p => {
      const price = Number(p.base_price || p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "price-low":
        sorted.sort((a, b) => Number(a.base_price || a.price) - Number(b.base_price || b.price));
        break;
      case "price-high":
        sorted.sort((a, b) => Number(b.base_price || b.price) - Number(a.base_price || a.price));
        break;
      case "rating":
        // Fallback or use real rating if available in future
        break;
      default:
        break;
    }

    return sorted;
  }, [products, selectedCategory, selectedSize, inStockOnly, priceRange, sortBy, searchQuery]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category !== "All") {
      newParams.set("category", category);
    } else {
      newParams.delete("category");
    }
    // preserve ?search=
    setSearchParams(newParams);
  };

  const handleResetAll = () => {
    setSelectedCategory("All");
    setSelectedSize(null);
    setInStockOnly(false);
    setPriceRange([0, 10000]);
    setSortBy("featured");
    setSearchParams({});
  };

  const categoryNames = useMemo(() => ["All", ...categories.map(c => c.category_name)], [categories]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <nav className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">
                <Link to="/stores" className="hover:text-primary transition-colors">Stores</Link>
                <span>/</span>
                <span className="text-gray-900">{selectedCategory}</span>
              </nav>
              <h1 className="text-5xl font-black text-gray-900 tracking-tight">
                {searchQuery ? `"${searchQuery}"` : "Heritage Footwear"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
               <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10 relative"
                style={{ backgroundImage: 'url("data:image/svg+xml,...")' }}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
             <button
                className="lg:hidden flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>

              {selectedCategory !== "All" && (
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold border border-primary/20">
                  {selectedCategory}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => handleCategoryChange("All")} />
                </div>
              )}
              <span className="hidden"><LayoutGrid className="w-4 h-4" /></span>

              <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-gray-400">
                {filteredAndSortedProducts.length} items found
              </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Filters Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-[2rem] p-8 sticky top-28 border border-gray-100 shadow-sm">
              {/* Categories */}
              <div className="mb-10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Categories</h3>
                <div className="space-y-2">
                  {categoryNames.map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        selectedCategory === category
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 font-sans">Price Range</h3>
                <div className="space-y-6">
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex items-center justify-between">
                    <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 text-xs font-black text-gray-900 italic">₱0</div>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 text-xs font-black text-primary italic">₱{priceRange[1].toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Size Filter */}
              <div className="mb-10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 font-sans">Sizes (US)</h3>
                <div className="grid grid-cols-4 gap-2">
                  {allSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`py-2 rounded-lg border text-[10px] font-black transition-all ${
                        selectedSize === size
                          ? 'border-primary bg-primary text-white shadow-md'
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="mb-10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setInStockOnly(!inStockOnly)}
                    className={`w-10 h-6 rounded-full transition-all relative ${inStockOnly ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${inStockOnly ? 'left-5' : 'left-1'}`} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-primary transition-colors">In Stock Only</span>
                </label>
              </div>

              <button
                onClick={handleResetAll}
                className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors py-2 border-t border-gray-50 pt-6"
              >
                Clear All filters
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                  <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading catalog...</p>
                </div>
              ) : filteredAndSortedProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-gray-100"
                >
                  <p className="text-gray-400 font-bold uppercase tracking-widest mb-4">No treasures found</p>
                  <button
                    onClick={handleResetAll}
                    className="text-primary font-black text-sm underline underline-offset-4"
                  >
                    Reset all filters
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8"
                >
                   {filteredAndSortedProducts.map((product, index) => (
                    <motion.div
                      layout
                      key={product.product_id ?? product.id ?? index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-[101] p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight italic">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Reuse the filtering logic here for mobile if needed */}
              <div className="space-y-12 pb-20">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categoryNames.map(category => (
                      <button
                        key={category}
                        onClick={() => handleCategoryChange(category)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                          selectedCategory === category
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Sizes (US)</h3>
                   <div className="flex flex-wrap gap-2">
                    {allSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                          selectedSize === size
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        US {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Availability</h3>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => setInStockOnly(!inStockOnly)}
                      className={`w-10 h-6 rounded-full transition-all relative ${inStockOnly ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${inStockOnly ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-600">Only In Stock</span>
                  </label>
                </div>

                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Price Limit</h3>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-4 text-sm font-black italic">
                    <span className="text-gray-400">₱0</span>
                    <span className="text-primary">₱{priceRange[1].toLocaleString()}</span>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-4 pb-0">
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full bg-gray-950 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-gray-200"
                  >
                    Show {filteredAndSortedProducts.length} Results
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
