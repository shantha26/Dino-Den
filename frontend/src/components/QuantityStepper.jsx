import { Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuantityStepper({ value, onChange, min = 0, accent = "fern" }) {
  const colors = {
    fern: "bg-fern",
    amber: "bg-amber",
    lava: "bg-lava",
    swamp: "bg-swamp",
  };
  const btnColor = colors[accent] || colors.fern;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`jelly-btn ${btnColor} text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shadow-popsm active:shadow-none disabled:opacity-30 disabled:cursor-not-allowed shrink-0`}
        disabled={value <= min}
      >
        <Minus size={13} strokeWidth={3} />
      </button>

      <div className="relative overflow-hidden w-6 sm:w-7 h-6 flex items-center justify-center shrink-0">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute font-display text-ink tabular-nums text-sm sm:text-base font-bold text-center"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className={`jelly-btn ${btnColor} text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shadow-popsm active:shadow-none shrink-0`}
      >
        <Plus size={13} strokeWidth={3} />
      </button>
    </div>
  );
}
