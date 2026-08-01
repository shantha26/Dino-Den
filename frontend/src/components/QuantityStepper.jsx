import { Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuantityStepper({ value, onChange, min = 0, accent = "fern", size = "md", large = false }) {
  const colors = {
    fern: "bg-fern",
    amber: "bg-amber",
    lava: "bg-lava",
    swamp: "bg-swamp",
  };
  const btnColor = colors[accent] || colors.fern;
  const isCompact = size === "sm";
  const btnSize = isCompact
    ? large
      ? "w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12"
      : "w-8 h-8"
    : "w-10 h-10";
  const iconSize = isCompact ? 14 : 18;

  return (
    <div className={`flex items-center ${large ? "gap-3.5 sm:gap-4 lg:gap-5" : "gap-2.5"}`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`jelly-btn ${btnColor} text-white rounded-full ${btnSize} flex items-center justify-center shadow-popsm active:shadow-none disabled:opacity-40`}
        disabled={value <= min}
      >
        <Minus size={iconSize} strokeWidth={3} className={large ? "lg:hidden" : ""} />
        {large && <Minus size={22} strokeWidth={3} className="hidden lg:block" />}
      </button>

      <div
        className={`relative overflow-hidden ${isCompact ? "w-6" : "w-7"} ${
          large ? "sm:w-8 lg:w-10" : ""
        } h-6 sm:h-7 lg:h-8 flex items-center justify-center`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className={`absolute font-display text-ink tabular-nums ${isCompact ? "text-base" : "text-lg"} ${
              large ? "sm:text-lg lg:text-xl" : ""
            }`}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className={`jelly-btn ${btnColor} text-white rounded-full ${btnSize} flex items-center justify-center shadow-popsm active:shadow-none`}
      >
        <Plus size={iconSize} strokeWidth={3} className={large ? "lg:hidden" : ""} />
        {large && <Plus size={22} strokeWidth={3} className="hidden lg:block" />}
      </button>
    </div>
  );
}
