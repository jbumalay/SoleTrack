import { motion, AnimatePresence } from "motion/react";
import { XCircle, X } from "lucide-react";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function CancelModal({ isOpen, onClose, onConfirm }: CancelModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl border border-gray-100"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black italic tracking-tight text-gray-900 mb-3">
                Cancel Order?
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-xs">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>
              <div className="flex gap-4 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl font-black italic text-sm transition-all"
                >
                  Keep Order
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black italic text-sm transition-all shadow-lg shadow-red-500/30"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
