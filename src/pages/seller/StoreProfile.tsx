import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";
import { Store, Save } from "lucide-react";
import { toast } from "sonner";

export default function StoreProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand_name: "",
    description: "",
    logo_url: "",
    banner_url: "",
    location: "",
    contact_email: "",
    phone: "",
  });

  useEffect(() => {
    apiService.getSellerProfile().then((res) => {
      if (res.status === "success") {
        const data = res.data;
        setForm({
          brand_name: data.brand_name || "",
          description: data.profile?.description || "",
          logo_url: data.profile?.logo_url || "",
          banner_url: data.profile?.banner_url || "",
          location: data.profile?.location || "",
          contact_email: data.profile?.contact_email || data.email || "",
          phone: data.profile?.phone || "",
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiService.updateSellerProfile(form);
      if (res.status === "success") {
        toast.success("Store profile updated");
        setForm({
          brand_name: res.data.brand_name || "",
          description: res.data.profile?.description || "",
          logo_url: res.data.profile?.logo_url || "",
          banner_url: res.data.profile?.banner_url || "",
          location: res.data.profile?.location || "",
          contact_email: res.data.profile?.contact_email || "",
          phone: res.data.profile?.phone || "",
        });
      }
    } catch {
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-10">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter">Store Profile</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Edit your artisan store details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-3xl p-8 sm:p-10 border border-gray-50 shadow-sm">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Brand Name</label>
          <input
            type="text"
            value={form.brand_name}
            onChange={update("brand_name")}
            className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
            placeholder="Your store name"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={update("description")}
            rows={4}
            className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium resize-none"
            placeholder="Tell your artisan story..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Logo URL</label>
            <input
              type="text"
              value={form.logo_url}
              onChange={update("logo_url")}
              className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Banner URL</label>
            <input
              type="text"
              value={form.banner_url}
              onChange={update("banner_url")}
              className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={update("location")}
            className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
            placeholder="City, Province"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Contact Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={update("contact_email")}
              className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
              placeholder="store@email.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={update("phone")}
              className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
              placeholder="+63 xxx xxx xxxx"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}