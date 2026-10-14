import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { 
  Package, 
  Ruler, 
  Plus, 
  Trash2, 
  Edit2, 
  XCircle, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({ category_name: "", description: "" });
  const [newSize, setNewSize] = useState({ size_value: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, sizesRes] = await Promise.all([
        apiService.getAdminCategories(),
        apiService.getAdminSizes()
      ]);
      if (catsRes.status === "success") setCategories(catsRes.data);
      if (sizesRes.status === "success") setSizes(sizesRes.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load catalog data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await apiService.updateAdminCategory(editingCategory.category_id, newCategory);
        toast.success("Category updated");
      } else {
        await apiService.createAdminCategory(newCategory);
        toast.success("Category created");
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setNewCategory({ category_name: "", description: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiService.createAdminSize(newSize);
      toast.success("Size created");
      setIsSizeModalOpen(false);
      setNewSize({ size_value: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure? This cannot be undone if products are not using it.")) return;
    try {
      await apiService.deleteAdminCategory(id);
      toast.success("Category deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    }
  };

  const handleDeleteSize = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await apiService.deleteAdminSize(id);
      toast.success("Size deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    }
  };

  if (loading) return (
    <div className="p-10 flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">
            Catalog Infrastructure
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
            Categories & Standardized Sizing
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Categories Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Package size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Product Categories</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{categories.length} Registered Nodes</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setEditingCategory(null);
                setNewCategory({ category_name: "", description: "" });
                setIsCategoryModalOpen(true);
              }}
              className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-primary transition-all shadow-lg shadow-gray-200"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
             <div className="divide-y divide-gray-50">
               {categories.map((cat) => (
                 <div key={cat.category_id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                   <div>
                     <h4 className="text-lg font-black italic tracking-tight text-gray-900">{cat.category_name}</h4>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{cat.description || "No description provided"}</p>
                   </div>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={() => {
                         setEditingCategory(cat);
                         setNewCategory({ category_name: cat.category_name, description: cat.description });
                         setIsCategoryModalOpen(true);
                       }}
                       className="w-9 h-9 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-primary hover:bg-blue-50 transition-all"
                     >
                       <Edit2 size={16} />
                     </button>
                     <button 
                       onClick={() => handleDeleteCategory(cat.category_id)}
                       className="w-9 h-9 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               ))}
               {categories.length === 0 && (
                 <div className="p-20 text-center">
                    <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">No categories defined</p>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Sizes Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <Ruler size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Shoe Size Ledger</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{sizes.length} Verified Sizes</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSizeModalOpen(true)}
              className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-primary transition-all shadow-lg shadow-gray-200"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
             <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
               {sizes.map((size) => (
                 <div 
                   key={size.size_id} 
                   className="group relative bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-center hover:shadow-lg transition-all"
                 >
                   <span className="text-lg font-black italic text-gray-900">{size.size_value}</span>
                   <button 
                     onClick={() => handleDeleteSize(size.size_id)}
                     className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-lg"
                   >
                     <Plus size={12} className="rotate-45" />
                   </button>
                 </div>
               ))}
               {sizes.length === 0 && (
                 <div className="col-span-full py-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">No size definitions</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="max-w-md w-full bg-white rounded-[40px] p-10 relative shadow-2xl"
            >
               <button 
                 onClick={() => setIsCategoryModalOpen(false)} 
                 className="absolute top-8 right-8 text-gray-300 hover:text-gray-900 transition-colors"
               >
                 <XCircle size={24} />
               </button>

               <h2 className="text-2xl font-black italic tracking-tighter text-gray-900 uppercase mb-2">
                 {editingCategory ? 'Modify Category' : 'Create Category'}
               </h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">
                 {editingCategory ? 'Update existing classification' : 'Establish a new product market node'}
               </p>

               <form onSubmit={handleCategorySubmit} className="space-y-6">
                 <div>
                   <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Category Name</label>
                   <input 
                     required
                     type="text"
                     value={newCategory.category_name}
                     onChange={(e) => setNewCategory({...newCategory, category_name: e.target.value})}
                     className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all"
                     placeholder="e.g. Traditional Loafers"
                   />
                 </div>

                 <div>
                   <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Manifest Description</label>
                   <textarea 
                     required
                     value={newCategory.description}
                     onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                     className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all min-h-[100px]"
                     placeholder="Abstract definition of this node..."
                   />
                 </div>

                 <button 
                   disabled={isSubmitting}
                   type="submit"
                   className="w-full py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                 >
                   {isSubmitting ? "Processing..." : (editingCategory ? "Apply Changes" : "Establish Category")}
                 </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Size Modal */}
      <AnimatePresence>
        {isSizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="max-w-md w-full bg-white rounded-[40px] p-10 relative shadow-2xl"
            >
               <button 
                 onClick={() => setIsSizeModalOpen(false)} 
                 className="absolute top-8 right-8 text-gray-300 hover:text-gray-900 transition-colors"
               >
                 <XCircle size={24} />
               </button>

               <h2 className="text-2xl font-black italic tracking-tighter text-gray-900 uppercase mb-2">
                 New Sizing Metric
               </h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">
                 Add a standardized shoe size to the ledger
               </p>

               <form onSubmit={handleSizeSubmit} className="space-y-6">
                 <div>
                   <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Size Value</label>
                   <input 
                     required
                     type="text"
                     value={newSize.size_value}
                     onChange={(e) => setNewSize({...newSize, size_value: e.target.value})}
                     className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all"
                     placeholder="e.g. 13.5 or XL"
                   />
                 </div>

                 <button 
                   disabled={isSubmitting}
                   type="submit"
                   className="w-full py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                 >
                   {isSubmitting ? "Processing..." : "Add to Ledger"}
                 </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
