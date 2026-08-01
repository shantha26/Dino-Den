import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Percent, Tag, PartyPopper, Plus, Trash2, Power, Loader2, RefreshCw, X,
  MessageCircle, Check,
} from "lucide-react";
import { fetchPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, sendOfferToAll } from "../api.js";

const emptyForm = {
  code: "",
  type: "flat",
  value: "",
  maxDiscountAmount: "",
  description: "",
  isFestival: false,
  festivalName: "",
  startDate: "",
  endDate: "",
  maxUses: "",
};

function isCurrentlyLive(promo) {
  if (!promo.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (promo.startDate && today < promo.startDate) return false;
  if (promo.endDate && today > promo.endDate) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  return true;
}

function PromoForm({ onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const canSubmit = form.code.trim() && form.value !== "" && Number(form.value) >= 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        code: form.code.trim(),
        type: form.type,
        value: Number(form.value),
        description: form.description.trim() || undefined,
        isFestival: form.isFestival,
        festivalName: form.isFestival ? form.festivalName.trim() || undefined : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        maxUses: form.maxUses !== "" ? Number(form.maxUses) : undefined,
        maxDiscountAmount:
          form.type === "percentage" && form.maxDiscountAmount !== ""
            ? Number(form.maxDiscountAmount)
            : undefined,
      };
      await createPromoCode(payload);
      setForm(emptyForm);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create that code — check the backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="jelly-btn self-start bg-lava text-white font-display text-base px-5 py-2.5 rounded-2xl shadow-popsm active:shadow-none flex items-center gap-2"
      >
        <Plus size={16} /> New Promo Code
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bone rounded-blob shadow-pop border-2 border-ink/10 p-5 md:p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-ink tracking-wide">New Promo Code</h3>
        <button type="button" onClick={() => { setOpen(false); setForm(emptyForm); }} className="text-ink/40 hover:text-ink/70">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-4 py-2.5 font-body font-bold text-ink uppercase placeholder:normal-case placeholder:font-semibold placeholder:text-ink/30 focus:outline-none text-sm"
          placeholder="CODE (e.g. DIWALI20)"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
        />
        <input
          className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-4 py-2.5 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none text-sm"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, type: "flat" }))}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 px-4 py-2.5 font-display text-sm transition-colors ${
            form.type === "flat" ? "border-fern bg-fern/10 text-fern" : "border-ink/10 text-ink/50"
          }`}
        >
          <Tag size={14} /> Flat ₹ off
        </button>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, type: "percentage" }))}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 px-4 py-2.5 font-display text-sm transition-colors ${
            form.type === "percentage" ? "border-fern bg-fern/10 text-fern" : "border-ink/10 text-ink/50"
          }`}
        >
          <Percent size={14} /> % off
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-ink/40 uppercase tracking-wide shrink-0 w-24">
            {form.type === "flat" ? "₹ amount" : "% off"}
          </span>
          <input
            type="number"
            min={0}
            className="w-full rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-3 py-2 font-body font-bold text-ink focus:outline-none text-sm"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
        </div>
        {form.type === "percentage" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-ink/40 uppercase tracking-wide shrink-0 w-24">Max ₹ cap</span>
            <input
              type="number"
              min={0}
              placeholder="No cap"
              className="w-full rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-3 py-2 font-body font-bold text-ink placeholder:text-ink/30 placeholder:font-semibold focus:outline-none text-sm"
              value={form.maxDiscountAmount}
              onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={form.isFestival}
          onChange={(e) => setForm((f) => ({ ...f, isFestival: e.target.checked }))}
          className="w-4 h-4 accent-lava"
        />
        <span className="text-sm font-bold text-ink/70 flex items-center gap-1.5">
          <PartyPopper size={14} className="text-lava" /> Festival offer
        </span>
      </label>

      {form.isFestival && (
        <input
          className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-4 py-2.5 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none text-sm"
          placeholder="Festival name (e.g. Diwali)"
          value={form.festivalName}
          onChange={(e) => setForm((f) => ({ ...f, festivalName: e.target.value }))}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-extrabold text-ink/40 uppercase tracking-wide">Start date</span>
          <input
            type="date"
            className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-3 py-2 font-body font-semibold text-ink focus:outline-none text-sm"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-extrabold text-ink/40 uppercase tracking-wide">End date</span>
          <input
            type="date"
            className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-3 py-2 font-body font-semibold text-ink focus:outline-none text-sm"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-extrabold text-ink/40 uppercase tracking-wide">Max uses</span>
          <input
            type="number"
            min={1}
            placeholder="Unlimited"
            className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-3 py-2 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none text-sm"
            value={form.maxUses}
            onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
          />
        </div>
      </div>

      {error && <p className="text-sm font-bold text-lava">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="jelly-btn self-start bg-fern text-white font-display text-base px-5 py-2.5 rounded-2xl shadow-popsm active:shadow-none disabled:opacity-40 flex items-center gap-2"
      >
        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
        Create Code
      </button>
    </motion.div>
  );
}

function PromoRow({ promo, onToggleActive, onDelete }) {
  const live = isCurrentlyLive(promo);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { totalCustomers, sentCount, failedCount } | { error }

  const discountText =
    promo.type === "flat" ? `₹${promo.value} off` : `${promo.value}% off${promo.maxDiscountAmount ? ` (max ₹${promo.maxDiscountAmount})` : ""}`;

  const handleBroadcast = async () => {
    setSending(true);
    setResult(null);
    try {
      const { data } = await sendOfferToAll({
        offerTitle: promo.festivalName || promo.code,
        offerDescription: promo.description || `Use code ${promo.code} for ${discountText}.`,
        offerExpiry: promo.endDate || "",
      });
      setResult(data);
    } catch (err) {
      setResult({ error: err?.response?.data?.error || "Could not send — check the backend server." });
    } finally {
      setSending(false);
      setConfirming(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-ink/10 rounded-2xl px-4 py-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-base text-ink">{promo.isFestival ? "🎊" : "🏷️"} {promo.code}</span>
            <span className="text-xs font-extrabold text-fern bg-fern/10 rounded-full px-2 py-0.5">
              {discountText}
            </span>
            <span className={`text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${live ? "bg-fern/10 text-fern" : "bg-ink/10 text-ink/40"}`}>
              {live ? "Live" : promo.active ? "Inactive window" : "Off"}
            </span>
          </div>
          <p className="text-xs font-bold text-ink/50 mt-0.5">
            {promo.festivalName ? `${promo.festivalName} · ` : ""}
            {promo.description ? `${promo.description} · ` : ""}
            Used {promo.usedCount}{promo.maxUses != null ? `/${promo.maxUses}` : ""}
            {promo.startDate || promo.endDate ? ` · ${promo.startDate || "…"} to ${promo.endDate || "…"}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setConfirming(true); setResult(null); }}
            disabled={sending}
            className="jelly-btn text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 bg-fern/10 text-fern hover:bg-fern/20 disabled:opacity-50"
            title="Send this offer via WhatsApp to every registered customer"
          >
            <MessageCircle size={11} /> Send to All
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(promo)}
            className={`jelly-btn text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 ${
              promo.active ? "bg-amber/15 text-amber" : "bg-fern text-white"
            }`}
          >
            <Power size={11} /> {promo.active ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(promo)}
            className="text-ink/30 hover:text-lava transition-colors"
            title="Delete code"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber/10 border-2 border-amber/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs font-bold text-ink/70">
                Send a WhatsApp message about <strong>{promo.code}</strong> to every registered customer?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                  className="text-xs font-bold text-ink/50 px-3 py-1.5 rounded-lg hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBroadcast}
                  disabled={sending}
                  className="jelly-btn text-xs font-bold px-3 py-1.5 rounded-lg bg-lava text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                  {sending ? "Sending…" : "Yes, send to all"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <div
          className={`text-xs font-bold rounded-xl px-3 py-2 ${
            result.error ? "bg-lava/10 text-lava" : "bg-fern/10 text-fern"
          }`}
        >
          {result.error
            ? result.error
            : `Sent to ${result.sentCount} of ${result.totalCustomers} customer${result.totalCustomers === 1 ? "" : "s"}.` +
              (result.failedCount > 0
                ? ` ${result.failedCount} failed — check that WhatsApp is configured in Settings → Notifications.`
                : "")}
        </div>
      )}
    </motion.div>
  );
}

export default function OffersManager() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchPromoCodes();
      setPromos(data || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load promo codes — check the backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleActive = async (promo) => {
    try {
      await updatePromoCode(promo._id, { active: !promo.active });
      load();
    } catch {
      // Row just stays as-is on failure; staff can retry.
    }
  };

  const handleDelete = async (promo) => {
    try {
      await deletePromoCode(promo._id);
      load();
    } catch {
      // Row just stays as-is on failure; staff can retry.
    }
  };

  const festivalPromos = promos.filter((p) => p.isFestival);
  const regularPromos = promos.filter((p) => !p.isFestival);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl md:text-2xl text-ink tracking-wide flex items-center gap-2">
          <Percent size={24} className="text-fern" /> Offers &amp; Promo Codes
        </h2>
        <button
          onClick={load}
          className="jelly-btn flex items-center gap-1.5 bg-fern text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-popsm active:shadow-none"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <PromoForm onCreated={load} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-ink/60 font-bold py-16">
          <Loader2 className="animate-spin" size={20} /> Loading offers...
        </div>
      ) : error ? (
        <div className="bg-lava/10 border-2 border-lava/40 text-lava font-bold rounded-2xl px-5 py-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="jelly-btn flex items-center gap-1.5 bg-lava text-white px-3 py-2 rounded-xl text-sm">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : promos.length === 0 ? (
        <div className="rounded-3xl bg-bone border-2 border-ink/10 shadow-pop px-6 py-10 text-center text-ink/50 font-bold">
          No promo codes yet — create one above.
        </div>
      ) : (
        <>
          {festivalPromos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink/40 flex items-center gap-1.5">
                <PartyPopper size={12} className="text-lava" /> Festival Offers
              </p>
              <AnimatePresence>
                {festivalPromos.map((p) => (
                  <PromoRow key={p._id} promo={p} onToggleActive={handleToggleActive} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          )}
          {regularPromos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink/40 flex items-center gap-1.5">
                <Tag size={12} className="text-fern" /> Standard Codes
              </p>
              <AnimatePresence>
                {regularPromos.map((p) => (
                  <PromoRow key={p._id} promo={p} onToggleActive={handleToggleActive} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}
