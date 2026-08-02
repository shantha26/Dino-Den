import { motion } from "framer-motion";
import QuantityStepper from "./QuantityStepper.jsx";

export default function ServiceRow({ emoji, title, priceLabel, value, onChange, accent = "fern" }) {
  const active = value > 0;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex flex-col justify-between items-center text-center p-3.5 sm:p-4 rounded-2xl border-2 transition-all h-full ${
        active
          ? "border-fern/60 bg-fern/10 shadow-popsm"
          : "border-ink/10 bg-white/90 hover:border-ink/20"
      }`}
    >
      {/* Top info block */}
      <div className="flex flex-col items-center gap-1.5 w-full min-w-0">
        <motion.span
          className="text-2xl sm:text-3xl leading-none"
          animate={active ? { rotate: [0, -8, 8, -4, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {emoji}
        </motion.span>
        <p className="font-display font-bold text-ink text-xs sm:text-sm leading-tight line-clamp-2 min-h-[2.1rem] flex items-center justify-center">
          {title}
        </p>
        <p className="text-[11px] sm:text-xs font-semibold text-ink/50 italic">
          {priceLabel}
        </p>
      </div>

      {/* Bottom quantity stepper block */}
      <div className="mt-3 pt-1.5 w-full flex justify-center">
        <QuantityStepper value={value} onChange={onChange} accent={accent} size="sm" />
      </div>
    </motion.div>
  );
}
