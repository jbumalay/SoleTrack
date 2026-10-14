import { useState, useEffect } from "react";
import { MapPin, Plus, Pencil, Trash2, Check, X, BookUser } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getSavedAddresses,
  saveAddress,
  deleteAddress,
  newAddressId,
  addressLine,
  SavedAddress,
} from "@/utils/addresses";
import { toast } from "sonner";

const EMPTY: Omit<SavedAddress, "id"> = {
  label: "",
  full_name: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  zip_code: "",
  email: "",
};

export function AddressBook({ onChange }: { onChange?: () => void }) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [form, setForm] = useState<Omit<SavedAddress, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAddresses(getSavedAddresses());
  }, []);

  const startAdd = () => {
    setEditing({ ...EMPTY, id: "" } as SavedAddress);
    setForm(EMPTY);
  };

  const startEdit = (address: SavedAddress) => {
    setEditing(address);
    setForm(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.full_name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.province.trim() || !form.zip_code.trim()) {
      toast.error("Please fill in every field");
      return;
    }
    setSaving(true);
    try {
      const entry: SavedAddress = { ...form, id: editing?.id || newAddressId() };
      const updated = saveAddress(entry);
      setAddresses(updated);
      setEditing(null);
      toast.success(editing?.id ? "Address updated" : "Address saved");
      onChange?.();
    } catch {
      toast.error("Could not save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Remove this address?")) return;
    setAddresses(deleteAddress(id));
    toast.success("Address removed");
    onChange?.();
  };

  return (
    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black italic tracking-tight flex items-center gap-4">
            Address Book
            <span className="w-8 h-[2px] bg-primary" />
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
            Saved destinations for faster checkout · stored on this device
          </p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200"
        >
          <Plus size={16} /> Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-16 px-10">
          <BookUser className="w-16 h-16 text-gray-100 mx-auto mb-6" />
          <p className="text-gray-400 font-black italic uppercase text-xs tracking-widest leading-relaxed">
            No saved addresses yet. Add one to reuse it at checkout.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <div key={address.id} className="p-8 rounded-[2.5rem] bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black italic text-gray-900">{address.label}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{address.full_name} · {address.phone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(address)} title="Edit address" className="p-2 text-gray-400 hover:text-primary rounded-lg transition-colors border border-gray-100 bg-white">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(address.id)} title="Remove address" className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors border border-gray-100 bg-white">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs font-bold text-gray-600 leading-relaxed">{addressLine(address)}</p>
              {address.email && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{address.email}</p>}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl w-full bg-white rounded-[40px] p-10 relative overflow-y-auto max-h-[90vh]"
            >
              <button onClick={() => setEditing(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black italic tracking-tighter text-gray-900 uppercase mb-2">
                {editing.id ? "Edit Address" : "Add Address"}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">
                {editing.id ? "Update your saved destination" : "Save a new delivery destination"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Label</label>
                  <input
                    required
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Home / Studio / Parents"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Full Name</label>
                    <input
                      required
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Phone</label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Street Address</label>
                  <input
                    required
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="House No., Street, Barangay"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">City</label>
                    <input
                      required
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Province</label>
                    <input
                      required
                      type="text"
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Zip Code</label>
                    <input
                      required
                      type="text"
                      value={form.zip_code}
                      onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Email (optional)</label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                  />
                </div>
                <button
                  disabled={saving}
                  type="submit"
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check size={16} /> {saving ? "Saving..." : editing.id ? "Preserve Changes" : "Save Address"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
