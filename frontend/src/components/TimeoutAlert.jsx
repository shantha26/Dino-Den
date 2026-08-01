import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogOut, X } from "lucide-react";

export default function TimeoutAlert({ items, onCheckout, onDismiss }) {
  return (
    <AnimatePresence>
      {items && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="ticket-notch relative max-w-md w-full rounded-3xl bg-bone shadow-pop border-2 border-amber/40 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber via-lava to-amber px-6 py-5 flex items-center gap-2 text-white">
              <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <Clock size={22} />
              </motion.span>
              <h2 className="font-display text-lg tracking-wide">Play Time's Up!</h2>
            </div>

            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="text-ink/70 font-bold text-sm">
                {items.length === 1
                  ? "This booking's 30-minute soft play session has ended — time to check out."
                  : `${items.length} bookings' 30-minute soft play sessions have ended — time to check out.`}
              </p>

              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.customer._id}
                    className="flex items-center justify-between gap-3 bg-amber/10 border-2 border-amber/25 rounded-2xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-base text-ink truncate">{item.customer.kidName}</p>
                      <p className="text-xs font-bold text-ink/50">
                        {item.packageLabel} · Checked in {item.customer.timeIn}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onCheckout(item)}
                        className="jelly-btn bg-fern text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-popsm active:shadow-none"
                      >
                        <LogOut size={14} /> Check Out
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismiss(item)}
                        aria-label="Dismiss"
                        className="text-ink/30 hover:text-ink/60 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
