import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Ticket, Clock, Loader2, RefreshCw, Phone, Bell,
  LogIn, X, CheckCircle2, PartyPopper, Hash,
} from "lucide-react";
import {
  fetchWaitlistStatus, fetchWaitlist, joinWaitlist,
  updateWaitlistEntry, removeWaitlistEntry, fetchLiveOffers,
} from "../api.js";
import { formatLocalDate } from "../utils.js";

const STATUS_CONFIG = {
  waiting: { label: "Waiting", color: "bg-amber/15 text-amber" },
  notified: { label: "Notified", color: "bg-fern/15 text-fern" },
  seated: { label: "Seated", color: "bg-ink/10 text-ink/50" },
  cancelled: { label: "Cancelled", color: "bg-lava/10 text-lava" },
};

const emptyJoinForm = { kidName: "", mobileNumber: "" };

function CapacityGauge({ status, onRefresh, loading }) {
  const pct = status ? Math.min(100, Math.round((status.currentOccupancy / status.capacity) * 100)) : 0;
  return (
    <div className="bg-bone rounded-blob shadow-pop border-2 border-fern/20 p-5 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-lg md:text-xl text-fern tracking-wide flex items-center gap-2">
          <Users size={20} /> Play Area Capacity
        </h2>
        <button
          onClick={onRefresh}
          className="jelly-btn flex items-center gap-1.5 bg-fern text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-popsm active:shadow-none"
        >
          {loading ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>

      {status && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 rounded-full bg-ink/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
                className={`h-full rounded-full ${status.isFull ? "bg-lava" : "bg-fern"}`}
              />
            </div>
            <span className="font-display text-lg text-ink shrink-0">
              {status.currentOccupancy}/{status.capacity}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full ${
                status.isFull ? "bg-lava text-white" : "bg-fern/10 text-fern"
              }`}
            >
              {status.isFull ? "🔴 At Capacity" : "🟢 Open"}
            </span>
            {status.waitingCount > 0 && (
              <span className="text-xs font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full bg-amber/15 text-amber">
                {status.waitingCount} on waitlist
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function JoinWaitlistForm({ onJoined }) {
  const [form, setForm] = useState(emptyJoinForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { entry, offers }

  const canSubmit = form.kidName.trim() && form.mobileNumber.length === 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await joinWaitlist({ ...form, parentName: form.kidName, date: formatLocalDate() });
      setResult(data);
      setForm(emptyJoinForm);
      onJoined?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not join the waitlist — check the backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const { entry, offers } = result;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bone rounded-blob shadow-pop border-2 border-fern/30 p-6 flex flex-col items-center text-center gap-3"
      >
        <span className="text-3xl">🎟️</span>
        <p className="font-display text-2xl text-fern">Token #{entry.tokenNumber}</p>
        <p className="text-sm font-bold text-ink/60">
          {entry.kidName} — position {entry.position} in line
        </p>
        <p className="text-sm font-extrabold text-amber">
          Estimated wait: ~{entry.estimatedWaitMinutes} min
        </p>

        {offers?.length > 0 && (
          <div className="w-full mt-2 flex flex-col gap-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-ink/40">While you wait — offers</p>
            {offers.map((o) => (
              <div key={o.code} className="bg-fern/8 border border-fern/20 rounded-xl px-3 py-2 text-left">
                <p className="font-display text-sm text-fern">
                  {o.isFestival ? "🎊 " : "🏷️ "}{o.code}
                  <span className="text-ink/40 font-bold normal-case ml-1">
                    ({o.type === "flat" ? `₹${o.value} off` : `${o.value}% off`})
                  </span>
                </p>
                {o.festivalName && <p className="text-[11px] font-bold text-ink/50">{o.festivalName}</p>}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setResult(null)}
          className="jelly-btn mt-2 bg-fern text-white font-display text-sm px-5 py-2.5 rounded-2xl shadow-popsm active:shadow-none"
        >
          Add Another Family
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-bone rounded-blob shadow-pop border-2 border-ink/10 p-5 md:p-6 flex flex-col gap-3">
      <h3 className="font-display text-lg text-ink tracking-wide flex items-center gap-2">
        <LogIn size={18} className="text-fern" /> Join the Waitlist
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-4 py-2.5 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none text-sm"
          placeholder="Kid name"
          value={form.kidName}
          onChange={(e) => setForm((f) => ({ ...f, kidName: e.target.value }))}
        />
        <input
          className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-4 py-2.5 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none text-sm"
          placeholder="Mobile number"
          inputMode="numeric"
          maxLength={10}
          value={form.mobileNumber}
          onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
        />
      </div>
      {error && <p className="text-sm font-bold text-lava">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="jelly-btn self-start bg-lava text-white font-display text-base px-5 py-2.5 rounded-2xl shadow-popsm active:shadow-none disabled:opacity-40 flex items-center gap-2"
      >
        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Hash size={16} />}
        Get a Token
      </button>
    </div>
  );
}

function QueueEntry({ entry, onUpdate, onRemove }) {
  const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.waiting;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-ink/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-display text-xl text-fern shrink-0">#{entry.tokenNumber}</span>
        <div className="min-w-0">
          <p className="font-display text-base text-ink truncate">{entry.kidName}</p>
          <p className="text-xs font-bold text-ink/50 flex items-center gap-1.5">
            <Phone size={11} /> {entry.mobileNumber}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {entry.status === "waiting" && (
          <span className="text-xs font-bold text-ink/50 flex items-center gap-1">
            <Clock size={12} /> ~{entry.estimatedWaitMinutes} min
          </span>
        )}
        <span className={`text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${cfg.color}`}>
          {cfg.label}
        </span>
        {entry.status === "waiting" && (
          <button
            type="button"
            onClick={() => onUpdate(entry._id, "notified")}
            className="jelly-btn bg-amber text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
            title="Notify family — table's ready"
          >
            <Bell size={11} /> Notify
          </button>
        )}
        {(entry.status === "waiting" || entry.status === "notified") && (
          <button
            type="button"
            onClick={() => onUpdate(entry._id, "seated")}
            className="jelly-btn bg-fern text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
            title="Mark seated"
          >
            <CheckCircle2 size={11} /> Seat
          </button>
        )}
        {entry.status !== "cancelled" && entry.status !== "seated" && (
          <button
            type="button"
            onClick={() => onRemove(entry._id)}
            className="text-ink/30 hover:text-lava transition-colors"
            title="Remove from queue"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function WaitlistPanel() {
  const [status, setStatus] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const date = formatLocalDate();
      const [statusRes, entriesRes] = await Promise.all([
        fetchWaitlistStatus(date),
        fetchWaitlist(date),
      ]);
      setStatus(statusRes.data);
      setEntries(entriesRes.data.entries || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load the waitlist — check the backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateWaitlistEntry(id, newStatus);
      load();
    } catch {
      // Entry stays as-is in the list; staff can retry.
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeWaitlistEntry(id);
      load();
    } catch {
      // Leave it in the list on failure so staff notice and retry.
    }
  };

  const activeEntries = entries.filter((e) => e.status === "waiting" || e.status === "notified");
  const pastEntries = entries.filter((e) => e.status === "seated" || e.status === "cancelled");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl md:text-2xl text-ink tracking-wide flex items-center gap-2">
          <Ticket size={24} className="text-fern" /> Waitlist
        </h2>
      </div>

      <CapacityGauge status={status} onRefresh={load} loading={loading} />

      <JoinWaitlistForm onJoined={load} />

      {error && (
        <div className="bg-lava/10 border-2 border-lava/40 text-lava font-bold rounded-2xl px-5 py-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="jelly-btn flex items-center gap-1.5 bg-lava text-white px-3 py-2 rounded-xl text-sm">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-ink/40">
          Current Queue ({activeEntries.length})
        </p>
        {activeEntries.length === 0 ? (
          <div className="rounded-3xl bg-bone border-2 border-ink/10 shadow-pop px-6 py-8 text-center text-ink/50 font-bold flex flex-col items-center gap-2">
            <PartyPopper size={22} className="text-fern" />
            Nobody's waiting right now.
          </div>
        ) : (
          <AnimatePresence>
            {activeEntries.map((entry) => (
              <QueueEntry key={entry._id} entry={entry} onUpdate={handleUpdateStatus} onRemove={handleRemove} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {pastEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink/40">
            Earlier Today ({pastEntries.length})
          </p>
          <div className="flex flex-col gap-2 opacity-60">
            {pastEntries.map((entry) => (
              <QueueEntry key={entry._id} entry={entry} onUpdate={handleUpdateStatus} onRemove={handleRemove} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
