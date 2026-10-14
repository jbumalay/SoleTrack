import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { LogIn, ArrowLeft, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = await login({ email, password });
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'seller') navigate('/seller');
      else navigate('/');
    } else {
      setError("Invalid artisan credentials");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100/50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-gray-200 border border-gray-100 text-gray-900 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full" />
        
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-primary mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </button>

        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-primary">
            <LogIn className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter mb-4 leading-none">Artisan <span className="text-primary italic">Portal.</span></h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sign in to your heritage identity</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3 ml-2">Identity Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-8 py-5 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm shadow-inner"
              placeholder="artisan@soletrack.com"
              required
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3 ml-2">Heritage Key</label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-8 py-5 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm shadow-inner"
              placeholder="••••••••"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-[52px] text-gray-300 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gray-950 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
          >
            Authenticate Portal
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            No identity yet?{" "}
            <Link to="/register" className="text-primary hover:underline underline-offset-4">
              Create Artisan Account
            </Link>
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-50">
          <div className="flex items-center justify-center gap-2 mb-6">
             <ShieldCheck className="w-4 h-4 text-primary" />
             <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Demo Testing Identities</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
             {["admin123", "seller123", "customer123"].map((id) => (
                <div key={id} className="p-3 bg-gray-50 rounded-xl text-[8px] font-black uppercase tracking-tighter text-center">
                   <div className="text-gray-400 mb-1">{id.replace('123', '')}</div>
                   <div className="text-primary uppercase overflow-hidden text-ellipsis line-clamp-1">{id.replace('123', '')}@soletrack.com</div>
                </div>
             ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
