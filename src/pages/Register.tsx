import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { UserPlus, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";

export function Register() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    brand_name: "",
    role: "customer" as "customer" | "seller"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Heritage keys do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Heritage key must be at least 8 characters");
      return;
    }

    if (formData.role === 'seller' && !formData.brand_name) {
      setError("Artisan Brand Name is required for sellers");
      return;
    }

    const [first_name, ...lastNameParts] = formData.name.split(" ");
    const last_name = lastNameParts.join(" ") || " ";

    const user = await register({
      first_name,
      last_name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      brand_name: formData.brand_name
    });
    
    if (user) {
      setSuccess(true);
      setTimeout(() => {
        if (user.role === 'seller') navigate('/seller');
        else navigate('/dashboard');
      }, 2500);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
           className="max-w-md w-full bg-gray-50 rounded-[3rem] p-12 text-center shadow-2xl border border-gray-100"
        >
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-3xl font-black mb-4 italic tracking-tight text-gray-900">Identity Crafted!</h2>
          <p className="text-gray-500 font-medium mb-10 leading-relaxed uppercase text-[10px] tracking-widest font-black">Redirecting to heritage portal...</p>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
             <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.5 }} className="h-full bg-green-500" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100/50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-gray-200 border border-gray-100 text-gray-900 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-[80px] rounded-full" />
        
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-primary mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </button>

        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-primary">
            <UserPlus className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter mb-4 leading-none">Join the <span className="text-primary italic">Collective.</span></h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Create your artisan heritage account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormLabel>Full Artisan Name</FormLabel>
              <FormInput name="name" value={formData.name} onChange={handleChange} placeholder="Juan Dela Cruz" required />
            </div>
            <div>
              <FormLabel>Identity Email</FormLabel>
              <FormInput type="email" name="email" value={formData.email} onChange={handleChange} placeholder="heritage@address.com" required />
            </div>
          </div>

          <div>
            <FormLabel>Mission Path</FormLabel>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-8 py-5 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm appearance-none cursor-pointer"
            >
              <option value="customer">Heritage Enthusiast (Buyer)</option>
              <option value="seller">Master Artisan (Seller)</option>
            </select>
          </div>

          {formData.role === "seller" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <FormLabel>Artisan Brand Name</FormLabel>
              <FormInput name="brand_name" value={formData.brand_name} onChange={handleChange} placeholder="e.g. Bicol Heritage Weaves" required />
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormLabel>Heritage Key</FormLabel>
              <FormInput type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required minLength={8} />
            </div>
            <div>
              <FormLabel>Confirm Key</FormLabel>
              <FormInput type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required minLength={8} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center italic">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gray-950 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95 flex items-center justify-center gap-3"
          >
            Forge Account
            <ShieldCheck className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Already a member?{" "}
            <Link to="/login" className="text-primary hover:underline underline-offset-4">
              Enter Artisan Portal
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
   return <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3 ml-2">{children}</label>;
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
   return (
      <input 
        {...props}
        className="w-full px-8 py-5 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm shadow-inner"
      />
   );
}
