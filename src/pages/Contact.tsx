import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { toast } from "sonner";

export function Contact() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", topic: "General Heritage Inquiry", message: "" });

  const handleMailTo = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Heritage Inquiry: ${form.topic}`);
    const body = encodeURIComponent(
      `Name: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\nTopic: ${form.topic}\n\n${form.message}`
    );
    window.location.href = `mailto:heritage@soletrack.com?subject=${subject}&body=${body}`;
    toast.success("Opening your email client...");
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row gap-20">
          {/* Info Side */}
          <div className="lg:w-1/3">
             <motion.div 
               initial={{ opacity: 0, x: -30 }}
               animate={{ opacity: 1, x: 0 }}
               className="sticky top-32"
             >
                <div className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-6 font-sans">Reach Out</div>
                <h1 className="text-6xl font-black italic tracking-tighter text-gray-900 mb-10 leading-[0.9]">Connect with <br /><span className="text-primary">Artisans.</span></h1>
                <p className="text-lg text-gray-500 font-medium mb-16 leading-relaxed">
                   Have a special request? Custom artisan orders or corporate heritage gifting inquiries are warmly welcomed.
                </p>

                <div className="space-y-10">
                   <ContactInfo icon={<Mail className="w-5 h-5" />} label="Artisan Portal" value="heritage@soletrack.com" />
                   <ContactInfo icon={<Phone className="w-5 h-5" />} label="Direct Line" value="+63 945 882 1234" />
                   <ContactInfo icon={<MapPin className="w-5 h-5" />} label="Bicol Workshop" value="Legazpi Artisan Row, Albay 4500" />
                </div>
                
                 <div className="mt-20 p-8 bg-primary rounded-[2.5rem] text-white shadow-2xl shadow-primary/20 flex items-center justify-between group cursor-pointer overflow-hidden relative">
                    <a href="mailto:heritage@soletrack.com" className="absolute inset-0" />
                    <div>
                       <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Live Support</div>
                       <div className="text-xl font-black italic">Chat with Us</div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <MessageCircle className="w-6 h-6" />
                    </div>
                 </div>
             </motion.div>
          </div>

          {/* Form Side */}
          <div className="lg:w-2/3">
             <motion.div 
               initial={{ opacity: 0, y: 40 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-gray-200/50 border border-gray-100"
             >
                 <h2 className="text-3xl font-black italic tracking-tight mb-12 text-gray-900">The Heritage <span className="text-primary italic underline underline-offset-4 decoration-2">Inquiry</span> Form</h2>
                 <form className="space-y-8" onSubmit={handleMailTo}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                          <FormLabel>First Name</FormLabel>
                          <ContactInput placeholder="Juan" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} />
                       </div>
                       <div>
                          <FormLabel>Last Name</FormLabel>
                          <ContactInput placeholder="Dela Cruz" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} />
                       </div>
                    </div>
                    
                    <div>
                       <FormLabel>Identity Email</FormLabel>
                       <ContactInput type="email" placeholder="heritage@address.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                    </div>

                    <div>
                       <FormLabel>Topic of Interest</FormLabel>
                       <select value={form.topic} onChange={(e) => setForm({...form, topic: e.target.value})} className="w-full px-8 py-5 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm appearance-none cursor-pointer">
                          <option>General Heritage Inquiry</option>
                          <option>Bulk Artisan Gifting</option>
                          <option>Custom Heritage Order</option>
                          <option>Artisan Partnership</option>
                       </select>
                    </div>

                    <div>
                       <FormLabel>Your Message to our Collective</FormLabel>
                       <textarea 
                         value={form.message} onChange={(e) => setForm({...form, message: e.target.value})}
                         rows={6}
                         placeholder="Tell us your story or question..."
                         className="w-full px-8 py-5 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm resize-none"
                       />
                    </div>

                    <button type="submit" className="w-full bg-gray-950 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center group active:scale-95">
                       Transmit Message
                       <Send className="ml-4 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                 </form>
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactInfo({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
   return (
      <div className="flex gap-6 items-center group">
         <div className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
            {icon}
         </div>
         <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</div>
            <div className="font-black text-gray-900 italic tracking-tight">{value}</div>
         </div>
      </div>
   );
}

function FormLabel({ children }: { children: React.ReactNode }) {
   return <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-3 ml-2">{children}</label>;
}

function ContactInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
   return (
      <input 
        {...props}
        className="w-full px-8 py-5 border border-gray-100 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-bold text-sm shadow-inner"
      />
   );
}
