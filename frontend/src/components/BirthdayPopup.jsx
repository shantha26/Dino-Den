import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, X } from "lucide-react";

export default function BirthdayPopup({ kids, onClose }) {
  return (
    <AnimatePresence>
      {kids && kids.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="ticket-notch relative max-w-md w-full rounded-3xl bg-bone shadow-pop border-2 border-lava/30 overflow-hidden"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 text-ink/40 hover:text-ink transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="bg-gradient-to-r from-lava via-amber to-lava px-6 py-5 flex items-center gap-2 text-white">
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, -10, 10, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                🎉
              </motion.span>
              <h2 className="font-display text-lg tracking-wide">Birthday Today!</h2>
            </div>

            <div className="px-6 py-5 flex flex-col gap-3">
              <p className="text-ink/70 font-bold text-sm">
                {kids.length === 1
                  ? "This little dino has a birthday today — say congrats!"
                  : `${kids.length} little dinos have birthdays today — say congrats!`}
              </p>
              <div className="flex flex-col gap-2.5">
                {kids.map((kid) => (
                  <div
                    key={`${kid.mobileNumber}-${kid.kidName}`}
                    className="flex items-center gap-3 bg-lava/10 border-2 border-lava/20 rounded-2xl px-4 py-3"
                  >
                    <span className="text-2xl">🎂</span>
                    <div>
                      <p className="font-display text-base text-ink">
                        {kid.kidName} <span className="text-lava">— turning {kid.turningAge}</span>
                      </p>
                      <p className="text-xs font-bold text-ink/50">Mobile: {kid.mobileNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="jelly-btn mt-1 w-full bg-fern text-white font-display text-base tracking-wide py-3 rounded-2xl shadow-popsm active:shadow-none flex items-center justify-center gap-2"
              >
                <PartyPopper size={18} /> Wonderful!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
