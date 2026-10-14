import { Link } from "react-router";
import { ArrowRight, Truck, Shield, Heart, Star, Users, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import { toast } from "sonner";

export function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const response = await apiService.getProducts({ limit: 4 });
        if (response.status === "success") {
          setFeaturedProducts(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 text-white py-24 lg:py-32">
        <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
          <img 
            src="https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=2012&auto=format&fit=crop" 
            alt="Hero background"
            className="w-full h-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full mb-6 border border-primary/30">
              <span className="text-primary text-xs font-bold uppercase tracking-widest">🇵🇭 Crafted in Bicol</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
              Honoring <br />
              <span className="text-primary italic">Heritage</span> in <br />
              Every Step
            </h1>
            <p className="text-xl mb-10 text-gray-400 font-medium leading-relaxed max-w-xl">
              Discover authentic handmade footwear from local Bicol artisans. We merge ancient craftsmanship with contemporary comfort.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/products"
                className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 group"
              >
                Shop Collection
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/about"
                className="inline-flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-xl font-bold hover:bg-white/10 transition-all font-sans uppercase text-xs tracking-widest"
              >
                Our Story
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Free Shipping</h4>
                <p className="text-xs text-gray-500 font-medium">On Bicol orders ₱500+</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Quality Guard</h4>
                <p className="text-xs text-gray-500 font-medium">100% Artisan Made</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Support Local</h4>
                <p className="text-xs text-gray-500 font-medium">Direct to Artisans</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Rated 4.9/5</h4>
                <p className="text-xs text-gray-500 font-medium">By 2000+ Customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="text-primary text-[10px] font-bold uppercase tracking-[0.3em] mb-3">Curated Selection</div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">Bicol's Finest <span className="text-primary underline underline-offset-8">Artistry</span></h2>
            </div>
            <Link 
              to="/products"
              className="group inline-flex items-center text-sm font-bold text-gray-900 hover:text-primary transition-colors"
            >
              View Full Catalog
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.product_id || product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">No products found. Check back later!</p>
            </div>
          )}
        </div>
      </section>

      {/* Artisan Showcase */}
      <section className="py-24 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1453487021979-4309c6467364?q=80&w=2070&auto=format&fit=crop" 
                  alt="Artisan at work"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-primary p-8 rounded-[2rem] text-white shadow-2xl max-w-[240px]">
                <Users className="w-8 h-8 mb-4 opacity-50" />
                <h4 className="text-2xl font-black mb-2">50+ Families</h4>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 leading-relaxed">
                  Directly supported through your purchases at SoleTrack
                </p>
              </div>
            </div>
            <div className="space-y-8">
              <div className="text-primary text-[10px] font-bold uppercase tracking-[0.3em]">The Soul of SoleTrack</div>
              <h2 className="text-5xl font-black tracking-tight text-gray-900 leading-tight">Empowering Bicolano <span className="text-primary italic">Craftsmanship</span></h2>
              <p className="text-lg text-gray-600 leading-relaxed font-medium">
                Every pair of shoes in our collection is born from the hands of master artisans in the Bicol region. Using sustainable materials like abaca, bamboo, and local leather, they preserve techniques passed down through seven generations.
              </p>
              <ul className="space-y-4">
                {[
                  "Fair trade compensation for every artisan",
                  "Sustainable material sourcing from Bicol farms",
                  "Preserving ancient Filipino weaving methods",
                  "100% handcrafted production process"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-gray-800 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary italic">✔</div>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="pt-4">
                <Link 
                  to="/about"
                  className="inline-flex items-center text-gray-900 font-black hover:text-primary transition-colors border-b-2 border-primary pb-1"
                >
                  Read Our Full Story
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 blur-[120px] rounded-full translate-x-1/2" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Stay in the <span className="text-primary italic">Loop</span></h2>
          <p className="text-lg text-gray-400 mb-10 font-medium max-w-2xl mx-auto">
            Get exclusive access to new artisan collections, cultural stories, and special heritage events.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).querySelector('input[type="email"]') as HTMLInputElement;
            const email = input?.value.trim();
            if (!email) { toast.error("Please enter your email"); return; }
            localStorage.setItem("soletrack_subscribed", email);
            toast.success("You're now part of the heritage circle!");
            input.value = "";
          }}>
            <input 
              type="email"
              placeholder="Email address"
              className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white/10 transition-all font-medium"
            />
            <button type="submit" className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 uppercase text-xs tracking-widest whitespace-nowrap">
              Subscribe
            </button>
          </form>
          <p className="mt-6 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            We value your privacy. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
