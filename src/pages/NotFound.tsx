import { Link } from "react-router";
import { Home as HomeIcon, Map } from "lucide-react";
import { motion } from "motion/react";

export function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <motion.div 
         initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
         className="text-center max-w-xl"
      >
        <div className="relative inline-block mb-12">
            <h1 className="text-[14rem] font-black italic tracking-tighter text-gray-100 leading-none">404</h1>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
               <h2 className="text-5xl font-black italic tracking-tight text-gray-900">Trail <span className="text-primary">Lost.</span></h2>
            </div>
        </div>
        <p className="text-xl text-gray-500 font-medium mb-12 leading-relaxed">
          The heritage trail you're looking for doesn't exist. Let's find your way back to our artisan collective.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/"
              className="inline-flex items-center justify-center gap-3 bg-gray-950 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-xl"
            >
              <HomeIcon className="w-4 h-4" />
              Return Store
            </Link>
            <Link 
              to="/products"
              className="inline-flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-md"
            >
              <Map className="w-4 h-4" />
              Explore Collection
            </Link>
        </div>
      </motion.div>
    </div>
  );
}
