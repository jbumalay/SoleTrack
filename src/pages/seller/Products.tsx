import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle,
  ChevronDown,
  Warehouse
} from "lucide-react";
import { toast } from "sonner";
import { LOW_STOCK_THRESHOLD } from "@/constants";

export default function SellerProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [prodRes, catRes, sizeRes] = await Promise.all([
        apiService.getSellerProducts(),
        apiService.getCategories(),
        apiService.getSizes()
      ]);
      if (prodRes.status === "success") setProducts(prodRes.data);
      if (catRes.status === "success") setCategories(catRes.data);
      if (sizeRes.status === "success") setSizes(sizeRes.data);
    } catch (error) {
      console.error("Fetch products error:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to retire this heritage craft? (Soft deletion only)")) {
      try {
        const response = await apiService.deleteSellerProduct(id);
        if (response.status === "success") {
          toast.success("Craft retired successfully");
          setProducts(products.filter(p => p.product_id !== id));
        }
      } catch (error) {
        toast.error("Failed to retire craft");
      }
    }
  };

  const startEdit = (product: any) => {
    setEditingId(product.product_id);
    
    // Build inventory array from all available sizes, merging in existing data
    const inventory = sizes.map(s => {
      const existing = (product.inventory ?? []).find((inv: any) => inv.size_id === s.size_id);
      return existing 
        ? { ...existing } 
        : { size_id: s.size_id, size_value: s.size_value, stock_quantity: 0 };
    });

    setEditValues({
      product_name: product.product_name,
      description: product.description,
      base_price: product.base_price,
      category_id: product.category_id,
      image_url: product.image_url,
      inventory
    });
    setIsEditModalOpen(true);
  };

  const saveEdit = async (productId: number) => {
    try {
      const payload = {
        product_id: productId,
        product_name: editValues.product_name,
        description: editValues.description,
        base_price: Number(editValues.base_price),
        category_id: Number(editValues.category_id),
        image_url: editValues.image_url,
        inventory: editValues.inventory.map((inv: any) => ({
          ...inv,
          stock_quantity: Math.max(0, Number(inv.stock_quantity))
        }))
      };

      const response = await apiService.updateSellerProduct(payload);
      if (response.status === "success") {
        toast.success("Artifact updated successfully");
        setEditingId(null);
        setIsEditModalOpen(false);
        fetchData(); // Refresh
      }
    } catch (error) {
       toast.error("Update failed");
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const inventory = sizes.map(s => ({
      size_id: s.size_id,
      stock_quantity: Number(data[`stock_${s.size_id}`] || 0)
    }));

    const payload = {
      product_name: data.product_name,
      description: data.description,
      base_price: Number(data.base_price),
      category_id: Number(data.category_id),
      image_url: data.image_url || "https://images.unsplash.com/photo-1603487742131-416a4220b29a?q=80&w=300&h=300&fit=crop",
      inventory
    };

    try {
      const response = await apiService.createSellerProduct(payload);
      if (response.status === "success") {
        toast.success("New product debuted");
        setIsAddModalOpen(false);
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  return (
    <div className="p-10 lg:p-20 space-y-16 max-w-[100rem] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Catalog Management</span>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic mt-2">
            Heritage <span className="text-primary underline underline-offset-8 decoration-4">Collection</span>
          </h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="group flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-gray-200"
        >
          <Plus size={16} /> New listing
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 flex items-center gap-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
             <Package size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Artifacts</p>
            <p className="text-2xl font-black italic">{products.length}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 flex items-center gap-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
             <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Low Stock Warning</p>
            <p className="text-2xl font-black italic">{products.filter(p => p.total_stock < LOW_STOCK_THRESHOLD).length}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
             <input 
              type="text" 
              placeholder="Search artifacts..." 
              className="pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold w-full md:w-80 focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300 transition-all"
             />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-3 text-gray-400 hover:text-primary transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Craft Details</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Price (₱)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Stock Level</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center font-black italic uppercase text-gray-400 tracking-widest text-xs">No artifacts revealed in your collection yet.</td>
                </tr>
              ) : products.map((product) => (
                <tr key={product.product_id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md bg-gray-100 shrink-0 transform group-hover:scale-110 transition-transform">
                         <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-black italic text-gray-900 tracking-tight">{product.product_name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: ST-{product.product_id.toString().padStart(4, '0')}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-xl">
                        {product.category_name}
                      </span>
                  </td>
                  <td className="px-8 py-6">
                      <span className="text-xs font-black italic">₱{Number(product.base_price).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${product.total_stock < LOW_STOCK_THRESHOLD ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                          <span className={`text-xs font-black italic ${product.total_stock < LOW_STOCK_THRESHOLD ? 'text-red-500' : 'text-gray-900'}`}>{product.total_stock} units</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                         onClick={() => startEdit(product)}
                         className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary rounded-xl transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                      
                      <button 
                        onClick={() => handleDelete(product.product_id)}
                        className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setPreviewProduct(product)}
                        className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                        title="Preview product"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter">Debut New Artifact</h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 italic">Enrich your heritage collection</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-4 hover:bg-white rounded-2xl transition-colors">
                  <X />
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto p-10 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Left Column: Basic Info */}
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Artifact Name</label>
                      <input 
                        name="product_name"
                        required
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="e.g. Traditional Hand-woven Slippers"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Description</label>
                      <textarea 
                        name="description"
                        required
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary h-40 resize-none shadow-sm"
                        placeholder="Describe the artisan journey of this craft..."
                      ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Base Price (₱)</label>
                        <input 
                          name="base_price"
                          type="number"
                          required
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Category</label>
                        <div className="relative">
                          <select 
                            name="category_id"
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm appearance-none"
                          >
                            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Visuals & Inventory */}
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Artifact Visual (URL)</label>
                      <input 
                        name="image_url"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                    
                    <div className="p-8 rounded-[2.5rem] bg-amber-50/50 border border-amber-100 space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                         <Warehouse size={14} /> Size-wise Inventory
                       </h3>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                         {sizes.map(s => (
                           <div key={s.size_id} className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-amber-500 italic block text-center">Size {s.size_value}</label>
                              <input 
                                name={`stock_${s.size_id}`}
                                type="number"
                                min="0"
                                defaultValue={0}
                                className="w-full px-3 py-3 bg-white border border-amber-100 rounded-xl text-[10px] font-black text-center focus:ring-2 focus:ring-amber-500 shadow-sm"
                              />
                           </div>
                         ))}
                       </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 flex items-center gap-6">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0">
                          <Package size={20} />
                        </div>
                        <p className="text-[10px] font-medium text-gray-500 leading-relaxed italic">
                           Adding units across multiple sizes will automatically calculate your total workshop stock levels.
                        </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-10 border-t border-gray-50">
                   <button 
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                    type="submit"
                    className="px-12 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 hover:-translate-y-1 transition-all"
                   >
                     Reveal Arrival
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Edit Product Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter">Refine Masterpiece</h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 italic">Updating artifact ST-{editingId?.toString().padStart(4, '0')}</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-4 hover:bg-white rounded-2xl transition-colors">
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Left Column: Basic Info */}
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Artifact Name</label>
                      <input 
                        value={editValues.product_name}
                        onChange={(e) => setEditValues({...editValues, product_name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="e.g. Traditional Hand-woven Slippers"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Description</label>
                      <textarea 
                        value={editValues.description}
                        onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary h-40 resize-none shadow-sm"
                        placeholder="Describe the artisan journey of this craft..."
                      ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Base Price (₱)</label>
                        <input 
                          type="number"
                          value={editValues.base_price}
                          onChange={(e) => setEditValues({...editValues, base_price: e.target.value})}
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Category</label>
                        <div className="relative">
                          <select 
                            value={editValues.category_id}
                            onChange={(e) => setEditValues({...editValues, category_id: e.target.value})}
                            className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm appearance-none"
                          >
                            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Update Visual (URL)</label>
                      <input 
                        value={editValues.image_url}
                        onChange={(e) => setEditValues({...editValues, image_url: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>

                  {/* Right Column: Inventory */}
                  <div className="space-y-8">
                    <div className="aspect-square w-full rounded-[2.5rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
                        <img src={editValues.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="p-8 rounded-[2.5rem] bg-amber-50/50 border border-amber-100 space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                         <Warehouse size={14} /> Adjust Inventory
                       </h3>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                         {editValues.inventory?.map((inv: any, idx: number) => (
                           <div key={inv.size_id} className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-amber-500 italic block text-center">Size {inv.size_value}</label>
                              <input 
                                type="number"
                                min="0"
                                value={inv.stock_quantity}
                                onChange={(e) => {
                                  const newInventory = [...editValues.inventory];
                                  newInventory[idx].stock_quantity = e.target.value;
                                  setEditValues({...editValues, inventory: newInventory});
                                }}
                                className="w-full px-3 py-3 bg-white border border-amber-100 rounded-xl text-[10px] font-black text-center focus:ring-2 focus:ring-amber-500 shadow-sm"
                              />
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-10 border-t border-gray-50">
                   <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                   >
                     Discard Changes
                   </button>
                   <button 
                    onClick={() => editingId && saveEdit(editingId)}
                    className="px-12 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 hover:-translate-y-1 transition-all"
                   >
                     Preserve Updates
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Preview Modal */}
      <AnimatePresence>
        {previewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Customer View</p>
                  <h2 className="text-2xl font-black italic tracking-tighter mt-1">Product Preview</h2>
                </div>
                <button onClick={() => setPreviewProduct(null)} className="p-4 hover:bg-white rounded-2xl transition-colors">
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Image */}
                  <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-gray-100 border border-gray-100">
                    <img src={previewProduct.image_url} alt={previewProduct.product_name} className="w-full h-full object-cover" />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{previewProduct.category_name}</span>
                      <h3 className="text-3xl font-black italic tracking-tighter text-gray-900 mt-1">{previewProduct.product_name}</h3>
                    </div>

                    <p className="text-3xl font-black italic text-gray-900">₱{Number(previewProduct.base_price).toLocaleString()}</p>

                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${previewProduct.total_stock < LOW_STOCK_THRESHOLD ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                      <span className={`text-xs font-black italic ${previewProduct.total_stock < LOW_STOCK_THRESHOLD ? 'text-red-500' : 'text-green-600'}`}>
                        {previewProduct.total_stock} units in stock
                      </span>
                    </div>

                    {Number(previewProduct.total_reviews) > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1,2,3,4,5].map(n => (
                            <svg key={n} className={`w-4 h-4 ${n <= Math.round(Number(previewProduct.average_rating)) ? 'text-primary fill-primary' : 'text-gray-200 fill-gray-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ))}
                        </div>
                        <span className="text-xs font-black italic text-gray-500">{Number(previewProduct.average_rating).toFixed(1)} · {previewProduct.total_reviews} reviews</span>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Description</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{previewProduct.description}</p>
                    </div>

                    {previewProduct.inventory?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Sizes & Stock</p>
                        <div className="grid grid-cols-4 gap-2">
                          {previewProduct.inventory.map((inv: any) => (
                            <div
                              key={inv.size_id}
                              className={`text-center py-3 rounded-xl border text-xs font-black ${Number(inv.stock_quantity) <= 0 ? 'border-gray-100 text-gray-300 bg-gray-50' : 'border-primary/20 text-primary bg-primary/5'}`}
                            >
                              <div>{inv.size_value}</div>
                              <div className="text-[9px] font-bold mt-0.5 text-gray-400">{inv.stock_quantity} left</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
