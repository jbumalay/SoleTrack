import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Mail, 
  Shield, 
  Store, 
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Lock,
  Unlock,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useSearchParams } from "react-router";

export default function AdminUsers() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAdminUsers({ 
        search, 
        role: roleFilter, 
        status: statusFilter 
      });
      if (response.status === "success") {
        setUsers(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  const handleUpdateStatus = async (user: any, newStatus: string) => {
    try {
      const response = await apiService.updateAdminUser(user.user_id, {
        ...user,
        status: newStatus
      });
      if (response.status === "success") {
        toast.success(`User set to ${newStatus}`);
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure? This action is irreversible.")) return;
    try {
      const response = await apiService.deleteAdminUser(id);
      if (response.status === "success") {
        toast.success("User permanently removed");
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    }
  };

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "customer",
    first_name: "",
    last_name: "",
    brand_name: "",
    status: "active"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await apiService.createAdminUser(newUser);
      if (response.status === "success") {
        toast.success("User created successfully");
        setIsAddModalOpen(false);
        setNewUser({
          email: "",
          password: "",
          role: "customer",
          first_name: "",
          last_name: "",
          brand_name: "",
          status: "active"
        });
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase">
            User Governance
          </h1>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">
            Master directory & access control
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200"
        >
          <UserPlus size={16} /> Add Artisan or Admin
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by credential or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select 
             value={roleFilter}
             onChange={(e) => setRoleFilter(e.target.value)}
             className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all appearance-none shadow-sm cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="customer">Customers</option>
            <option value="seller">Artisan Sellers</option>
            <option value="admin">Platform Admins</option>
          </select>
        </div>
        <div className="relative">
          <AlertCircle className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none transition-all appearance-none shadow-sm cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="pending_approval">Awaiting Approval</option>
            <option value="suspended">Suspended Accounts</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Identity</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Role & Rank</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400">Joined</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10 bg-gray-50/20" />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Users size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No matching users found</p>
                    </div>
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-black italic text-gray-400 border border-gray-100">
                           {user.first_name?.[0] || user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black italic text-gray-900 leading-none mb-1">
                            {user.first_name} {user.last_name || user.username}
                          </p>
                          <p className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                            <Mail size={10} /> {user.email}
                          </p>
                          {user.brand_name && (
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-1 flex items-center gap-1">
                              <Store size={10} /> {user.brand_name}
                            </p>
                          )}
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-8">
                     <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                       user.role === 'admin' ? 'bg-red-50 text-red-600' :
                       user.role === 'seller' ? 'bg-blue-50 text-blue-600' :
                       'bg-gray-50 text-gray-600'
                     }`}>
                       {user.role === 'admin' ? <Shield size={10} /> : user.role === 'seller' ? <Store size={10} /> : <User size={10} />}
                       {user.role}
                     </span>
                  </td>
                  <td className="px-8 py-8">
                     <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                       user.status === 'active' ? 'bg-green-50 text-green-600' :
                       user.status === 'pending_approval' ? 'bg-amber-50 text-amber-600' :
                       'bg-red-50 text-red-600'
                     }`}>
                       {user.status === 'active' ? <CheckCircle2 size={10} /> : user.status === 'pending_approval' ? <Clock size={10} className="animate-pulse" /> : <XCircle size={10} />}
                       {user.status.replace('_', ' ')}
                     </span>
                  </td>
                  <td className="px-8 py-8">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {user.status === 'pending_approval' && (
                         <button 
                           onClick={() => handleUpdateStatus(user, 'active')}
                           className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors border border-green-100"
                           title="Approve Seller"
                         >
                           <CheckCircle2 size={16} />
                         </button>
                       )}
                       {user.status === 'active' ? (
                         <button 
                           onClick={() => handleUpdateStatus(user, 'suspended')}
                           className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100"
                           title="Suspend User"
                         >
                           <Lock size={16} />
                         </button>
                       ) : user.status === 'suspended' && (
                         <button 
                           onClick={() => handleUpdateStatus(user, 'active')}
                           className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors border border-green-100"
                           title="Activate User"
                         >
                           <Unlock size={16} />
                         </button>
                       )}
                       <button 
                         onClick={() => handleDeleteUser(user.user_id)}
                         className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors border border-red-50"
                         title="Delete User"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="max-w-xl w-full bg-white rounded-[40px] p-10 relative overflow-y-auto max-h-[90vh]"
             >
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="absolute top-8 right-8 text-gray-400 hover:text-gray-900"
                >
                  <XCircle size={24} />
                </button>

                <h2 className="text-2xl font-black italic tracking-tighter text-gray-900 uppercase mb-2">
                  Create Artisan Access
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">
                  Provision a new account on behalf of a partner
                </p>

                <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">First Name</label>
                      <input 
                        required
                        type="text"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Last Name</label>
                      <input 
                        required
                        type="text"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Email Address</label>
                    <input 
                      required
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Initial Password</label>
                    <input 
                      required
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Role</label>
                      <select 
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none appearance-none"
                      >
                        <option value="customer">Customer</option>
                        <option value="seller">Artisan Seller</option>
                        <option value="admin">Platform Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Status</label>
                      <select 
                        value={newUser.status}
                        onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none appearance-none"
                      >
                        <option value="active">Active</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  {newUser.role === 'seller' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-4">Artisan Brand Name</label>
                      <input 
                        required={newUser.role === 'seller'}
                        type="text"
                        value={newUser.brand_name}
                        onChange={(e) => setNewUser({...newUser, brand_name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none"
                        placeholder="e.g. Bicol Heritage Weaves"
                      />
                    </motion.div>
                  )}

                  <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                  >
                    {isSubmitting ? "Provisioning..." : "Finalize Provisioning"}
                  </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
