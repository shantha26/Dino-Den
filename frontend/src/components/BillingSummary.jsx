import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronUp, Ticket, X, CheckCircle2 } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { validatePromoCode, fetchLiveOffers } from "../api.js";
import { formatLocalDate } from "../utils.js";
import { Stegosaurus } from "./shared/AnimatedDinosaurs.jsx";

function SectionDivider() {
  return <div className="ticket-perforation mx-0 my-1" />;
}

function LineItem({ emoji, label, qty, unitPrice, amount, unit = "" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg shrink-0">{emoji}</span>
        <div className="min-w-0">
          <p className="font-body font-semibold text-ink text-sm leading-tight truncate">{label}</p>
          <p className="text-xs text-ink/40 font-bold">
            {qty} {unit || "×"} ₹{unitPrice}
          </p>
        </div>
      </div>
      <span className="font-display text-base text-ink tabular-nums shrink-0">₹{amount.toFixed(0)}</span>
    </div>
  );
}

function SummaryRow({ label, value, muted = false, accent = false, strikethrough = false }) {
  return (
    <div className={`flex items-center justify-between font-body text-sm ${muted ? "text-ink/50" : "text-ink"}`}>
      <span className={`font-bold ${accent ? "text-fern font-extrabold" : ""}`}>{label}</span>
      <span className={`tabular-nums font-bold ${accent ? "text-fern" : ""} ${strikethrough ? "line-through text-ink/40" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function BillingSummary({
  totals, paymentMethod, splitPayment, onSave, saving, saved, disabled, appliedPromo, editing, onCancelEdit,
  previouslyPaid = 0, newAdditions = null, amountDueNow = null, liveOffers = [],
}) {
  const { settings } = useSettings();
  const [discountInput, setDiscountInput] = useState("");
  const [showItems, setShowItems] = useState(true);
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState("idle"); // idle | checking | error
  const [promoError, setPromoError] = useState("");
  const [fetchedOffers, setFetchedOffers] = useState([]);

  useEffect(() => {
    if (!liveOffers || liveOffers.length === 0) {
      fetchLiveOffers(formatLocalDate())
        .then(({ data }) => setFetchedOffers(data || []))
        .catch(() => setFetchedOffers([]));
    }
  }, [liveOffers]);

  const activeOffers = (liveOffers && liveOffers.length > 0) ? liveOffers : fetchedOffers;

  const hasItems = totals.allLineItems?.length > 0;
  const discount = totals.discountAmount || 0;
  const gst = totals.gstAmount || 0;
  const gstPercentage = settings.gstPercentage || 0;
  const hasGST = gstPercentage > 0;

  // Incremental billing (edit mode only) — how much of the current total was
  // already paid for, what's new since then, and what's actually owed now.
  const newAdditionItems = newAdditions?.lineItems || [];
  const newAdditionsCost = newAdditions?.cost || 0;
  const dueNow = amountDueNow ?? totals.grandTotal;
  const nothingNewOwed = editing && dueNow === 0;

  const paymentLabel =
    paymentMethod === "split"
      ? `🔀 Split (💵₹${splitPayment?.cashAmount ?? 0} + 📱₹${splitPayment?.gpayAmount ?? 0})`
      : paymentMethod === "gpay"
      ? "📱 GPay"
      : "💵 Cash";

  useEffect(() => {
    if (saved) {
      setDiscountInput("");
      setPromoInput("");
      setPromoStatus("idle");
      setPromoError("");
    }
  }, [saved]);

  const handleApplyPromoCode = async (codeToUse) => {
    const code = (codeToUse !== undefined ? codeToUse : promoInput).trim();
    if (!code) return;
    setPromoStatus("checking");
    setPromoError("");
    try {
      const { data } = await validatePromoCode(code, totals.subtotal);
      if (!data.valid) {
        setPromoStatus("error");
        setPromoError(data.reason || "That promo code isn't valid.");
        return;
      }
      setDiscountInput("");
      document.dispatchEvent(new CustomEvent("kpa:discount", { detail: 0 }));
      document.dispatchEvent(
        new CustomEvent("kpa:promo", { detail: { code: data.promo.code, discountAmount: data.discountAmount, promo: data.promo } })
      );
      setPromoStatus("idle");
      setPromoInput("");
    } catch {
      setPromoStatus("error");
      setPromoError("Could not validate that code — check the backend server.");
    }
  };

  const handleRemovePromo = () => {
    document.dispatchEvent(new CustomEvent("kpa:promo", { detail: null }));
    setPromoStatus("idle");
    setPromoError("");
  };

  return (
    <div className="sticky top-6">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="ticket-notch rounded-3xl bg-bone shadow-pop border-2 border-ink/10 overflow-hidden min-h-[420px] flex flex-col"
      >
        {/* Header */}
        <div className="bg-fern text-white px-6 py-5 lg:px-7 lg:py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🦴</span>
            <h2 className="font-display text-xl lg:text-2xl tracking-wide">Expedition Pass</h2>
          </div>
          {hasItems && (
            <button
              type="button"
              onClick={() => setShowItems((v) => !v)}
              className="text-white/70 hover:text-white transition-colors"
            >
              {showItems ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          )}
        </div>

        {/* Empty state */}
        {!hasItems && (
          <div className="px-6 py-16 min-h-[320px] flex flex-col items-center justify-center text-center">
            <Stegosaurus className="w-28 h-20 mb-4 opacity-80" />
            <p className="text-lg font-bold text-ink/40">No items selected yet.</p>
            <p className="text-base text-ink/30 mt-2">Add packages above to see the summary.</p>
          </div>
        )}

        {/* Line items */}
        <AnimatePresence initial={false}>
          {hasItems && showItems && (
            <motion.div
              key="items"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="px-6 lg:px-7 pt-5 pb-3 flex flex-col divide-y divide-ink/5">
                {totals.allLineItems.map((item, i) => (
                  <LineItem key={i} {...item} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasItems && (
          <>
            <SectionDivider />

            {/* Subtotal + discount + GST */}
            <div className="px-6 lg:px-7 py-4 flex flex-col gap-3">
              <SummaryRow label="Subtotal" value={`₹${totals.subtotal.toFixed(0)}`} muted />

              {/* Promo code */}
              {appliedPromo ? (
                <div className="flex items-center justify-between gap-2 bg-fern/8 border border-fern/20 rounded-xl px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-fern uppercase tracking-wide">
                    <CheckCircle2 size={13} /> {appliedPromo.code}
                    <span className="text-ink/40 font-bold normal-case">
                      ({appliedPromo.type === "flat"
                        ? `₹${appliedPromo.value} off`
                        : appliedPromo.type === "percent"
                        ? `${appliedPromo.value}% off`
                        : `₹${appliedPromo.discountAmount} off`})
                    </span>
                  </span>
                  <button type="button" onClick={handleRemovePromo} className="text-ink/40 hover:text-lava transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Dropdown for active offers if available */}
                  {activeOffers.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Ticket size={13} className="text-amber shrink-0" />
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setPromoInput(val);
                            handleApplyPromoCode(val);
                          }
                        }}
                        defaultValue=""
                        className="w-full rounded-lg border border-amber/40 bg-amber/5 px-2.5 py-1.5 text-xs font-bold text-ink focus:outline-none focus:border-fern cursor-pointer"
                      >
                        <option value="" disabled>🏷️ Select Promo Code</option>
                        {activeOffers.map((offer) => (
                          <option key={offer.code} value={offer.code}>
                            {offer.code} ({offer.type === "flat" ? `₹${offer.value} off` : `${offer.value}% off`}){offer.description ? ` — ${offer.description}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Manual promo code input */}
                  <div className="flex items-center gap-1.5">
                    {activeOffers.length === 0 && <Ticket size={13} className="text-amber shrink-0" />}
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus("idle"); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPromoCode()}
                      placeholder="Enter promo code"
                      className="flex-1 min-w-0 rounded-lg border border-ink/15 px-2.5 py-1.5 text-sm font-bold text-ink uppercase tracking-wide focus:outline-none focus:border-fern bg-white placeholder:normal-case placeholder:font-semibold placeholder:text-ink/30"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyPromoCode()}
                      disabled={!promoInput.trim() || promoStatus === "checking"}
                      className="jelly-btn shrink-0 bg-fern text-white text-xs font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-lg shadow-popsm active:shadow-none disabled:opacity-40"
                    >
                      {promoStatus === "checking" ? <Loader2 className="animate-spin" size={13} /> : "Apply"}
                    </button>
                  </div>
                </div>
              )}
              {promoStatus === "error" && (
                <p className="text-xs font-bold text-lava -mt-1">{promoError}</p>
              )}

              {discount > 0 && (
                <SummaryRow label="Discount applied" value={`−₹${discount.toFixed(0)}`} muted />
              )}

              {hasGST && (
                <SummaryRow label={`GST (${gstPercentage}%)`} value={`₹${gst.toFixed(0)}`} muted />
              )}
            </div>

            <SectionDivider />

            {editing ? (
              <>
                {/* Incremental billing breakdown — never re-charge for
                    services already paid for on this booking. */}
                <div className="px-6 lg:px-7 py-4 flex flex-col gap-3 bg-amber/5">
                  <SummaryRow label="Previously Paid" value={`₹${previouslyPaid.toFixed(0)}`} muted />

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-extrabold text-amber uppercase tracking-wide">
                      New Additions
                    </span>
                    {newAdditionItems.length > 0 ? (
                      <div className="flex flex-col divide-y divide-ink/5">
                        {newAdditionItems.map((item, i) => (
                          <LineItem key={i} {...item} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-ink/40">No new items added yet.</p>
                    )}
                    {newAdditionItems.length > 0 && (
                      <div className="flex items-center justify-between font-body text-sm text-ink pt-1.5">
                        <span className="font-extrabold text-amber">New Additions Total</span>
                        <span className="tabular-nums font-extrabold text-amber">₹{newAdditionsCost.toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <SectionDivider />

                {/* Amount actually payable right now */}
                <div className="px-6 lg:px-7 py-5 flex items-center justify-between">
                  <span className="font-display text-ink text-lg lg:text-xl tracking-wide">Amount Due Now</span>
                  <motion.span
                    key={dueNow}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className={`font-display text-2xl lg:text-3xl tabular-nums ${nothingNewOwed ? "text-ink/40" : "text-lava"}`}
                  >
                    ₹{dueNow.toFixed(0)}
                  </motion.span>
                </div>
                {nothingNewOwed && (
                  <p className="px-6 lg:px-7 -mt-2 pb-2 text-xs font-bold text-fern flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Already paid in full — nothing more to collect.
                  </p>
                )}

                {/* Overall, all-time value of the booking (for reference only) */}
                <div className="px-6 lg:px-7 pb-4 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-ink/40">
                    Overall Booking Value
                  </span>
                  <span className="text-sm font-bold text-ink/50 tabular-nums">
                    ₹{totals.grandTotal.toFixed(0)}
                  </span>
                </div>
              </>
            ) : (
              /* Grand total (new booking — nothing paid yet) */
              <div className="px-6 lg:px-7 py-5 flex items-center justify-between">
                <span className="font-display text-ink text-lg lg:text-xl tracking-wide">Grand Total</span>
                <motion.span
                  key={totals.grandTotal}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="font-display text-2xl lg:text-3xl text-fern tabular-nums"
                >
                  ₹{totals.grandTotal.toFixed(0)}
                </motion.span>
              </div>
            )}

            {/* Payment method indicator */}
            <div className="px-6 lg:px-7 pb-5">
              <div className="flex items-center justify-between bg-fern/5 border border-fern/15 rounded-xl px-4 py-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-ink/40">Payment</span>
                <span className="font-display text-sm text-fern">{paymentLabel}</span>
              </div>
            </div>
          </>
        )}

        {/* Save button */}
        <div className="px-6 lg:px-7 pb-6 pt-1 mt-auto flex flex-col gap-3">
          <motion.button
            type="button"
            onClick={onSave}
            disabled={disabled || saving}
            whileTap={{ scale: 0.97 }}
            className={`jelly-btn w-full font-display text-xl lg:text-2xl tracking-wide py-4 lg:py-5 rounded-2xl shadow-pop active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              editing ? "bg-amber text-white" : "bg-lava text-white"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {saving ? (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="animate-spin" size={20} /> {editing ? "Updating..." : "Saving..."}
                </motion.span>
              ) : saved ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className="flex items-center gap-2"
                >
                  🐣 {editing ? "Updated!" : "Hatched! Saved"}
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {editing
                    ? nothingNewOwed
                      ? "✏️ Update Booking"
                      : `✏️ Collect ₹${dueNow.toFixed(0)} & Update`
                    : "🥚 Save Booking"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {editing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs font-extrabold uppercase tracking-wide text-ink/40 hover:text-lava transition-colors text-center"
            >
              Cancel Edit — start a new booking instead
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
