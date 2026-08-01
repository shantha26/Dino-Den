import { motion } from "framer-motion";
import QuantityStepper from "./QuantityStepper.jsx";

// Spacious card: emoji + name + price stacked on top, stepper comfortably
// below with its own breathing room. `large` scales everything up further on
// sm/lg+ screens so cards stay roomy and easy to tap on bigger displays.
export default function ServiceRow({ emoji, title, priceLabel, value, onChange, accent = "fern", large = false }) {
  const active = value > 0;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex flex-col items-center text-center gap-2 rounded-2xl border-2 bg-bone transition-colors ${
        large ? "px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7 gap-2.5 lg:gap-3" : "px-4 py-4"
      } ${active ? "border-fern/50 bg-fern/5 shadow-popsm" : "border-ink/15"}`}
    >
      <motion.span
        className={`leading-none ${large ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl"}`}
        animate={active ? { rotate: [0, -8, 8, -4, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        {emoji}
      </motion.span>
      <p
        className={`font-display font-bold text-ink leading-snug ${
          large ? "text-base sm:text-lg lg:text-xl" : "text-sm"
        }`}
      >
        {title}
      </p>
      <p className={`text-ink/50 italic ${large ? "text-sm lg:text-base" : "text-xs"}`}>
        {priceLabel}
      </p>
      <div className={large ? "mt-1 lg:mt-2" : "mt-0.5"}>
        <QuantityStepper value={value} onChange={onChange} accent={accent} size="sm" large={large} />
      </div>
    </motion.div>
  );
}
