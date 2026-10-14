import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import {
  Ticket,
  Plus,
  Search,
  Trash2,
  Pencil,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { normalizeList } from "@/utils/normalizeList";

const EMPTY_FORM = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  min_subtotal: "",
  expires_at: "",
  usage_limit: "",
  is_active: true,
};

export default function AdminPromos() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAdminPromoCodes();
      if (response.status === "success") setPromos(normalizeList(response.data) ?? []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch promo codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  };

  const startEdit = (promo: any) => {
    setEditingId(promo.promo_code_id);
    setForm({
      code: promo.code ?? "",
      discount_type: promo.discount_type ?? "percent",
      discount_value: String(promo.discount_value ?? ""),
      min_subtotal: String(promo.min_subtotal ?? ""),
      expires_at: promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 10) : "",
      usage_limit: promo.usage_limit === null || promo.usage_limit === undefined ? "" : String(promo.usage_limit),
      is_active: Number(promo.is_active) === 1,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(form.code.trim())) {
      toast.error("Code must be 3-50 letters, numbers, dash or underscore");
      return;
    }
    const value = Number(form.discount_value);
    if (!Number.isFinite(value) || value <= 0 || (form.discount_type === "percent" && value > 100)) {
      toast.error(form.discount_type === "percent" ? "Percent must be between 0 and 100" : "Amount must be greater than zero");
      return;
    }
    setIsSubmitting(true);
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: value,
      min_subtotal: form.min_subtotal.trim() === "" ? 0 : Number(form.min_subtotal),
      expires_at: form.expires_at || null,
      usage_limit: form.usage_limit.trim() === "" ? null : Number(form.usage_limit),
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        await apiService.updateAdminPromoCode(editingId, payload);
        toast.success("Voucher updated");
      } else {
        await apiService.createAdminPromoCode(payload);
        toast.success("Voucher created");
      }
      setIsModalOpen(false);
      fetchPromos();
    } catch (error: any) {
      toast.error(error.message || "Failed to save voucher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Retire this voucher? This cannot be undone.")) return;
    try {
      await apiService.deleteAdminPromoCode(id);
      toast.success("Voucher retired");
      fetchPromos();
    } catch (error: any) {
      toast.error(error.message || "Failed to retire voucher");
    }
  };

  const visiblePromos = search.trim()
    ? promos.filter(p => (p.code ?? "").toLowerCase().includes(search.toLowerCase()))
    : promos;

  const discountLabel = (promo: any) =>
    promo.discount_type === "percent"
      ? `${Number(promo.discount_value)}% off`
      : `₱${Number(promo.discount_value).toLocaleString()} off`;

  const validityLabel = (promo: any) => {
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) return "Expired";
    if (Number(promo.is_active) !== 1) return "Inactive";
    return "Active";
  };

  return (
    <div className="p-6 lg:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">
            Voucher Codes
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
            Promo code catalog for checkout discounts
          </p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200"
        >
          <Plus size={16} /> New Voucher
        </button>
      </div>

      <div className="relative md:max-w-md">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Code</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Discount</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Min Subtotal</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Usage</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Expires</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">State</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-8 py-10 bg-gray-50/20" />
                  </tr>
                ))
              ) : visiblePromos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Ticket size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No voucher codes yet</p>
                    </div>
                  </td>
                </tr>
              ) : visiblePromos.map((promo) => {
                const state = validityLabel(promo);
                return (
                  <tr key={promo.promo_code_id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-8">
                      <span className="text-sm font-black italic text-primary tracking-tight">{promo.code}</span>
                    </td>
                    <td className="px-8 py-8 text-xs font-black italic text-gray-900">{discountLabel(promo)}</td>
                    <td className="px-8 py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      ₱{Number(promo.min_subtotal ?? 0).toLocaleString()}
                    </td>
                    <td className="px-8 py-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {Number(promo.used_count ?? 0)} / {promo.usage_limit ?? "∞"}
                    </td>
                    <td className="px-8 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-8 py-8">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        state === "Active" ? "bg-green-50 text-green-600 border-green-100"
                          : state === "Inactive" ? "bg-gray-50 text-gray-500 border-gray-100"
                          : "bg-red-50 text-red-600 border-red-100"
                      }`}>
                        {state === "Active" ? <CheckCircle2 size={10} /> : <Clock size={10} />} {state}
                      </span>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(promo)}
                          className="p-2 text-gray-400 hover:text-primary rounded-lg transition-colors border border-gray-100 bg-white"
                          title="Edit voucher"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(promo.promo_code_id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors border border-gray-100 bg-white"
                          title="Retire voucher"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl w-full bg-white rounded-[40px] p-10 relative overflow-y-auto max-h-[90vh]"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900">
                <XCircle size={24} />
              </button>

              <h2 className="text-2xl font-black italic tracking-tighter text-gray-900 uppercase mb-2">
                {editingId ? "Refine Voucher" : "Create Voucher"}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">
                {editingId ? "Update an existing promo code" : "Add a new checkout discount"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Code</label>
                  <input
                    required
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="WELCOME10"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Discount Type</label>
                    <select
                      value={form.discount_type}
                      onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none appearance-none"
                    >
                      <option value="percent">Percent (%)</option>
                      <option value="fixed">Fixed (₱)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">
                      {form.discount_type === "percent" ? "Percent Off" : "Amount Off (₱)"}
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Min Subtotal (₱)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.min_subtotal}
                      onChange={(e) => setForm({ ...form, min_subtotal: e.target.value })}
                      placeholder="0"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Usage Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={form.usage_limit}
                      onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                      placeholder="Unlimited"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black tracking-widest focus:border-primary outline-none"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-5 h-5 rounded-md border-gray-200 text-primary focus:ring-primary"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Active (usable at checkout)</span>
                </label>
                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingId ? "Preserve Changes" : "Create Voucher"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
