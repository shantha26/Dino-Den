import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { getKidPackageBreakdown } from "../../utils.js";

export default function VisitCard({ visit, index }) {
  const kidBreakdown = getKidPackageBreakdown(visit);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-bone border border-ink/10 rounded-xl px-4 py-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Clock size={13} className="text-fern shrink-0" />
          {visit.date}
          {visit.timeIn && (
            <span className="text-ink/50 font-bold">
              {visit.timeIn}{visit.timeOut ? ` – ${visit.timeOut}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              visit.paymentMethod === "split"
                ? "bg-lava/10 text-lava"
                : visit.paymentMethod === "gpay"
                ? "bg-fern/10 text-fern"
                : "bg-amber/15 text-amber"
            }`}
          >
            {visit.paymentMethod === "split"
              ? `🔀 Split (💵₹${visit.splitPayment?.cashAmount ?? 0} + 📱₹${visit.splitPayment?.gpayAmount ?? 0})`
              : visit.paymentMethod === "gpay"
              ? "📱 GPay"
              : "💵 Cash"}
          </span>
          <span className="font-display text-base text-fern">
            ₹{(visit.billing?.grandTotal || 0).toFixed(0)}
          </span>
        </div>
      </div>
      {kidBreakdown.length > 0 && (
        <div className="flex flex-col gap-1">
          {kidBreakdown.map((k, i) => (
            <p key={i} className="text-xs font-bold text-ink/60">
              <span className="text-ink/80">{k.name}:</span>{" "}
              {k.packages.length > 0 ? (
                <span className="text-fern/80">{k.packages.join(", ")}</span>
              ) : (
                <span className="text-ink/30 italic">no package on record</span>
              )}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
