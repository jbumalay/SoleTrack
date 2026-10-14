import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Facebook, Instagram, Twitter, Footprints } from "lucide-react";
import { apiService } from "@/services/api";
import { normalizeList } from "@/utils/normalizeList";

export function Footer() {
  const [categories, setCategories] = useState<{ category_id: number; category_name: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    apiService.getCategories()
      .then((res) => {
        if (!mounted) return;
        if (res.status === "success") setCategories(normalizeList<{ category_id: number; category_name: string }>(res.data));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const shopLinks = categories.length > 0
    ? categories.slice(0, 4).map((c) => ({ label: c.category_name, to: `/products?category=${encodeURIComponent(c.category_name)}` }))
    : [
        { label: "All Products", to: "/products" },
        { label: "Stores", to: "/stores" },
      ];

  return (
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 group mb-6 inline-flex">
              <div className="bg-primary p-2 rounded-xl text-primary-foreground transition-all group-hover:scale-105 group-active:scale-95 shadow-lg shadow-primary/20">
                <Footprints className="w-5 h-5" />
              </div>
              <div className="flex flex-col -space-y-1 text-left">
                <span className="text-xl font-black italic tracking-tighter leading-none text-white">Sole<span className="text-primary">Track</span></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 ml-0.5">Heritage Collective</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed">
              Authentic Filipino and Bicol footwear. Handcrafted with pride, supporting local artisans and preserving heritage.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              {shopLinks.map((l) => (
                <li key={l.label}><Link to={l.to} className="hover:text-primary transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Social Media</h3>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs">
            © 2026 SoleTrack. All rights reserved. Made with ❤️ in Bicol.
          </p>
          <div className="flex space-x-6 text-xs uppercase tracking-widest">
            <Link to="/about" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/about" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
