import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Banknote, Smartphone, SplitSquareHorizontal, CalendarDays } from "lucide-react";
import { formatDMY } from "../utils.js";

const OPTIONS = [
  { key: "cash", label: "Cash", icon: Banknote, emoji: "💵" },
  { key: "gpay", label: "GPay", icon: Smartphone, emoji: "📱" },
  { key: "split", label: "Split", icon: SplitSquareHorizontal, emoji: "🔀" },
];

// Clamp a typed amount to whole rupees between 0 and the grand total.
const clampAmount = (raw, max) => {
  const digitsOnly = String(raw).replace(/[^0-9]/g, "");
  const num = digitsOnly === "" ? 0 : parseInt(digitsOnly, 10);
  return Math.min(Math.max(num, 0), Math.max(Math.round(max), 0));
};

export default function PaymentMethod({ value, onChange, splitAmounts, onSplitChange, grandTotal, totalLabel, date }) {
  const total = Math.max(Math.round(grandTotal || 0), 0);
  const cashAmount = splitAmounts?.cashAmount ?? 0;
  const gpayAmount = splitAmounts?.gpayAmount ?? 0;

  const selectMethod = (key) => {
    if (key === "split") {
      // Default the full total to Cash so the two amounts always sum to the
      // total the moment Split is selected — the cashier can then move
      // however much of it over to GPay.
      onSplitChange({ cashAmount: total, gpayAmount: 0 });
    } else {
      onSplitChange({ cashAmount: 0, gpayAmount: 0 });
    }
    onChange(key);
  };

  const handleCashChange = (raw) => {
    const cash = clampAmount(raw, total);
    onSplitChange({ cashAmount: cash, gpayAmount: total - cash });
  };

  const handleGpayChange = (raw) => {
    const gpay = clampAmount(raw, total);
    onSplitChange({ cashAmount: total - gpay, gpayAmount: gpay });
  };

  // If the grand total changes while Split is active (e.g. staff adds/removes
  // a package), keep Cash Amount as the anchor and re-derive GPay so the two
  // still always add up to the new total.
  const prevTotal = useRef(total);
  useEffect(() => {
    if (value === "split" && prevTotal.current !== total) {
      const cash = Math.min(cashAmount, total);
      onSplitChange({ cashAmount: cash, gpayAmount: total - cash });
    }
    prevTotal.current = total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, value]);

  return (
    <div className="rounded-3xl bg-bone shadow-pop border-2 border-ink/10 p-6 md:p-8 lg:p-9">
      <div className="flex items-center justify-between gap-3 flex-wrap pb-5 mb-2 border-b-2 border-ink/10">
        <span className="text-base md:text-lg font-extrabold text-ink uppercase tracking-wide">
          Payment Method
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {totalLabel && (
            <span className="flex items-center gap-1.5 text-xs md:text-sm font-extrabold text-amber bg-amber/10 rounded-full px-3.5 py-1.5 shrink-0">
              {totalLabel}: ₹{total}
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-ink/50 bg-ink/5 rounded-full px-3.5 py-1.5 shrink-0">
              <CalendarDays size={14} className="text-fern" />
              {formatDMY(date)}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mt-5">
        {OPTIONS.map(({ key, label, icon: Icon, emoji }) => {
          const active = value === key;
          return (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => selectMethod(key)}
              className={`jelly-btn flex items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-4 sm:py-5 lg:py-6 font-display text-lg lg:text-xl tracking-wide shadow-popsm active:shadow-none transition-colors min-h-[64px] ${
                active
                  ? "bg-fern text-white border-fern"
                  : "bg-white text-ink border-ink/15 hover:border-fern/50"
              }`}
            >
              <span className="text-2xl md:text-3xl leading-none">{emoji}</span>
              <Icon size={22} />
              {label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {value === "split" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-6">
              <label className="flex flex-col gap-2">
                <span className="text-xs md:text-sm font-extrabold text-ink/60 uppercase tracking-wide flex items-center gap-1.5">
                  💵 Cash Amount
                </span>
                <div className="flex items-center rounded-2xl border-2 border-ink/10 bg-white px-4 py-3.5 lg:py-4 focus-within:border-fern transition-colors">
                  <span className="text-ink/40 font-bold mr-1.5">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-transparent font-body font-semibold text-ink focus:outline-none text-base sm:text-lg"
                    value={cashAmount}
                    onChange={(e) => handleCashChange(e.target.value)}
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs md:text-sm font-extrabold text-ink/60 uppercase tracking-wide flex items-center gap-1.5">
                  📱 GPay Amount
                </span>
                <div className="flex items-center rounded-2xl border-2 border-ink/10 bg-white px-4 py-3.5 lg:py-4 focus-within:border-fern transition-colors">
                  <span className="text-ink/40 font-bold mr-1.5">₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-transparent font-body font-semibold text-ink focus:outline-none text-base sm:text-lg"
                    value={gpayAmount}
                    onChange={(e) => handleGpayChange(e.target.value)}
                  />
                </div>
              </label>
            </div>
            <p className="text-xs md:text-sm font-bold text-ink/40 mt-3">
              Cash + GPay always adds up to {totalLabel ? `the ${totalLabel.toLowerCase()}` : "the total"} (₹{total}) — edit either amount and the other adjusts automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
