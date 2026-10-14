import { useState, useEffect } from "react";
import { Link } from "react-router";
import { UserCog, Lock, FileText, Loader2, KeyRound, MapPin } from "lucide-react";
import { apiService } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { AddressBook } from "@/components/AddressBook";
import { normalizeList } from "@/utils/normalizeList";
import { toast } from "sonner";

export function Account() {
  const { user, refreshUser, isSeller } = useAuth();
  const [profile, setProfile] = useState({ first_name: "", last_name: "", brand_name: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        brand_name: user.brand_name || "",
      });
    }
  }, [user]);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await apiService.getMyOrders();
        if (response.status === "success") setOrders(normalizeList(response.data) ?? []);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to load orders");
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchOrders();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiService.updateMyProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        ...(isSeller ? { brand_name: profile.brand_name } : {}),
      });
      await refreshUser();
      toast.success("Profile updated");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.new_password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await apiService.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password updated — re-login works with the new key");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Account Settings</span>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic mt-2">
              Personal <span className="text-primary underline underline-offset-8 decoration-4">Account</span>
            </h1>
          </div>
          <Link
            to="/dashboard"
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center gap-2"
          >
            <MapPin size={14} /> Dashboard & addresses
          </Link>
        </div>

        {/* Profile */}
        <form onSubmit={handleProfileSave} className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-8">
          <div>
            <h2 className="text-2xl font-black italic tracking-tight flex items-center gap-4">
              Profile
              <span className="w-8 h-[2px] bg-primary" />
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
              {user?.email} · changes reflect across the site immediately
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">First Name</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Last Name</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
              />
            </div>
            {isSeller && (
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Brand Name</label>
                <input
                  type="text"
                  value={profile.brand_name}
                  onChange={(e) => setProfile({ ...profile, brand_name: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                />
              </div>
            )}
          </div>
          <button
            disabled={savingProfile}
            type="submit"
            className="flex items-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <UserCog size={16} />}
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Password */}
        <form onSubmit={handlePasswordSave} className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-8">
          <div>
            <h2 className="text-2xl font-black italic tracking-tight flex items-center gap-4">
              Password
              <span className="w-8 h-[2px] bg-primary" />
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
              Requires your current password · minimum 8 characters
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Current Password</label>
              <input
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black tracking-widest focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">New Password</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black tracking-widest focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black tracking-widest focus:border-primary outline-none"
              />
            </div>
          </div>
          <button
            disabled={savingPassword}
            type="submit"
            className="flex items-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
          >
            {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>

        {/* Invoices */}
        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black italic tracking-tight flex items-center gap-4">
              Invoices
              <span className="w-8 h-[2px] bg-primary" />
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
              Printable receipts for every commission
            </p>
          </div>
          {loadingOrders ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-[10px] font-black italic uppercase tracking-widest text-gray-400">No orders yet</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {orders.map((order) => (
                <li key={order.order_id} className="flex items-center justify-between gap-4 py-5">
                  <div>
                    <p className="text-xs font-black italic text-gray-900">#ORD-{String(order.order_id).padStart(5, "0")}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString() : "N/A"} · {order.order_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-black italic text-gray-900">₱{Number(order.total_amount ?? 0).toLocaleString()}</span>
                    <Link
                      to={`/invoice/${order.order_id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary hover:border-primary transition-all"
                    >
                      <FileText size={14} /> Invoice
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Address book (manage saved checkout destinations) */}
        <AddressBook />

        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-300 justify-center pb-4">
          <Lock size={12} /> SoleTrack demo account · data stored locally and in the demo database
        </div>
      </div>
    </div>
  );
}
