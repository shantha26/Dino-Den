import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Loader2 } from "lucide-react";
import { verifyAdminSecurity } from "../api.js";

// Extra gate in front of the Settings page, on top of already requiring an
// authenticated admin JWT. Checked against the admin's own security
// password on the backend (Settings → Security), not a hardcoded value.
export default function AdminPinModal({ open, onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setChecking(true);
    try {
      await verifyAdminSecurity(pin);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || "Incorrect password. Try again.");
      setPin("");
      inputRef.current?.focus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
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
            className="relative max-w-sm w-full rounded-3xl glass-card shadow-pop border-2 border-fern/30 overflow-hidden"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 text-ink/40 hover:text-ink transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="bg-jungle-gradient px-6 py-5 flex items-center gap-2 text-cream">
              <Lock size={20} />
              <h2 className="font-display text-lg tracking-wide">Admin Security Check</h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-3">
              <p className="text-ink/70 font-bold text-sm">
                Enter your admin security password to open Settings.
              </p>
              <input
                ref={inputRef}
                type="password"
                autoComplete="off"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Security password"
                className="w-full rounded-2xl border-2 border-fern/30 glass-input px-4 py-3 text-center text-lg tracking-wide font-display text-ink focus:outline-none focus:border-fern"
              />
              {error && (
                <p className="text-lava font-bold text-xs text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={checking || !pin}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-fern text-cream font-display text-base tracking-wide py-3 shadow-pop hover:brightness-105 transition disabled:opacity-60"
              >
                {checking && <Loader2 className="animate-spin" size={16} />}
                Unlock
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
