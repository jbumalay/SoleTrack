import { motion } from "motion/react";
import { Users, Leaf, Heart, Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router";

export function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gray-950 text-white overflow-hidden">
         <div className="absolute inset-0 opacity-20">
            <img src="https://images.unsplash.com/photo-1453487021979-4309c6467364?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover grayscale" alt="Artisan hands" />
         </div>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               className="max-w-3xl"
            >
               <div className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-6">Our Genesis</div>
               <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter mb-8 leading-[0.9]">Beyond <br /><span className="text-primary">Footwear.</span></h1>
               <p className="text-xl text-gray-400 font-medium leading-relaxed">
                  SoleTrack was founded on the belief that traditional craftsmanship shouldn't be a relic of the past, but the soul of the future. Based in the heart of Bicol, we empower artisans to bring their heritage to a global stage.
               </p>
            </motion.div>
         </div>
      </section>

      {/* Pillars */}
      <section className="py-24 bg-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
               <div className="space-y-6">
                  <div className="w-16 h-16 rounded-[2rem] bg-orange-50 flex items-center justify-center text-primary">
                     <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-black italic tracking-tight underline underline-offset-8 decoration-primary decoration-4">Community</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    We don't just hire artisans; we partner with families. Over 50 Bicolano households are sustained through fair-trade practices that value skill over speed.
                  </p>
               </div>
               <div className="space-y-6">
                  <div className="w-16 h-16 rounded-[2rem] bg-orange-50 flex items-center justify-center text-primary">
                     <Leaf className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-black italic tracking-tight underline underline-offset-8 decoration-primary decoration-4">Ecology</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    Bicol's nature provides our palette. From sustainable abaca fibers to biodegradable bamboo, our materials are sourced directly from local eco-farms.
                  </p>
               </div>
               <div className="space-y-6">
                  <div className="w-16 h-16 rounded-[2rem] bg-orange-50 flex items-center justify-center text-primary">
                     <Heart className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-black italic tracking-tight underline underline-offset-8 decoration-primary decoration-4">Heritage</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    Every stitch follows a pattern Seven generations old. We are guardians of the Bicolano weaving tradition, ensuring these techniques never fade.
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* Impact */}
      <section className="py-24 bg-gray-50/50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gray-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                  <div>
                     <h2 className="text-5xl font-black italic tracking-tight leading-tight mb-8">The <span className="text-primary italic">Bicolano</span> <br />Artisan Ripple</h2>
                     <p className="text-lg text-gray-400 font-medium leading-relaxed mb-10">
                        When you wear SoleTrack, you're not just wearing a shoe. You're supporting education, clean water initiatives, and traditional workshop preservation in rural Albay and Camarines Sur communities.
                     </p>
                     <div className="flex gap-8">
                        <div>
                           <div className="text-4xl font-black text-primary mb-2">500+</div>
                           <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pairs/Month</div>
                        </div>
                        <div className="w-[1px] bg-white/10" />
                        <div>
                           <div className="text-4xl font-black text-primary mb-2">12</div>
                           <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Master Villages</div>
                        </div>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl rotate-[-3deg]">
                        <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="Red shoe" />
                     </div>
                     <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-xl translate-y-8 rotate-[3deg]">
                        <img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=2012&auto=format&fit=crop" className="w-full h-full object-cover" alt="Artisan shoe" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
         <div className="max-w-4xl mx-auto px-4">
            <Globe className="w-12 h-12 text-primary mx-auto mb-8 animate-pulse" />
            <h2 className="text-5xl font-black italic tracking-tight text-gray-900 mb-8">Join the Heritage Movement</h2>
            <p className="text-xl text-gray-500 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
               Every purchase is a vote for slow fashion, local mastery, and cultural pride. Discover your pair today.
            </p>
            <Link 
               to="/products"
               className="inline-flex items-center justify-center bg-gray-950 text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-2xl group"
            >
               Browse Collection
               <ArrowRight className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
         </div>
      </section>
    </div>
  );
}
