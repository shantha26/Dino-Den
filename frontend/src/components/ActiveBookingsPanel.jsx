import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PawPrint, Pencil, LogOut, Clock, Loader2, Users } from "lucide-react";
import { getKidPackageBreakdown, minutesSince, formatElapsed, isBookingDue } from "../utils.js";
import { Velociraptor } from "./shared/AnimatedDinosaurs.jsx";

function BookingCard({ booking, now, editingId, checkingOutId, onEdit, onCheckout }) {
  const elapsed = minutesSince(booking.date, booking.timeIn, now);
  const due = isBookingDue(booking, now);
  const isEditing = editingId === booking._id;
  const isCheckingOut = checkingOutId === booking._id;
  const kidBreakdown = getKidPackageBreakdown(booking);
  const packageLabels = kidBreakdown.flatMap((k) => k.packages);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`rounded-2xl border-2 px-4 py-3 flex flex-col gap-2 bg-white shadow-popsm transition-colors ${
        isEditing
          ? "border-amber ring-2 ring-amber/30"
          : due
          ? "border-lava/40 bg-lava/[0.03]"
          : "border-fern/15"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base text-ink leading-tight truncate">{booking.kidName}</p>
          <p className="text-xs font-bold text-ink/45 truncate">{booking.parentName}</p>
        </div>
        <motion.span
          key={due ? "due" : "active"}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full flex items-center gap-1 ${
            due ? "bg-lava text-white" : "bg-fern/10 text-fern"
          }`}
        >
          {due ? "🔴 Due" : "🟢 Active"}
        </motion.span>
      </div>

      {packageLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {packageLabels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] font-bold text-amber bg-amber/10 border border-amber/20 rounded-full px-2 py-0.5"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs font-bold text-ink/50">
        <span className="flex items-center gap-1">
          <Clock size={12} /> In {booking.timeIn}
        </span>
        <span className={`flex items-center gap-1 tabular-nums ${due ? "text-lava" : "text-fern"}`}>
          ⏱ {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onEdit(booking)}
          disabled={isCheckingOut}
          className="jelly-btn flex-1 flex items-center justify-center gap-1.5 bg-fern/10 text-fern text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl border-2 border-fern/20 disabled:opacity-40"
        >
          <Pencil size={13} /> {isEditing ? "Editing…" : "Edit"}
        </button>
        <button
          type="button"
          onClick={() => onCheckout(booking)}
          disabled={isCheckingOut}
          className="jelly-btn flex-1 flex items-center justify-center gap-1.5 bg-lava/10 text-lava text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl border-2 border-lava/20 disabled:opacity-40"
        >
          {isCheckingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          {isCheckingOut ? "..." : "Check Out"}
        </button>
      </div>
    </motion.div>
  );
}

export default function ActiveBookingsPanel({ bookings, loading, editingId, checkingOutId, onEdit, onCheckout }) {
  // Ticks every 20s purely to force elapsed-time / due-status recalculation —
  // no data refetching happens here.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);

  const dueCount = bookings.filter((b) => isBookingDue(b, now)).length;

  return (
    <div className="xl:sticky xl:top-6">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-bone shadow-pop border-2 border-ink/10 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]"
      >
        <div className="bg-gradient-to-r from-swamp to-fern text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PawPrint size={18} />
            <h2 className="font-display text-lg tracking-wide">Today's Active Bookings</h2>
          </div>
          <span className="bg-white/15 text-xs font-extrabold px-2.5 py-1 rounded-full tabular-nums">
            {bookings.length}
          </span>
        </div>

        {dueCount > 0 && (
          <div className="bg-lava/10 border-b-2 border-lava/20 px-5 py-2 text-xs font-extrabold text-lava uppercase tracking-wide">
            🔴 {dueCount} {dueCount === 1 ? "kid is" : "kids are"} due for checkout
          </div>
        )}

        <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-ink/40 font-bold text-sm">
              <Loader2 className="animate-spin" size={16} /> Loading...
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-2">
              <Velociraptor className="w-16 h-16 mb-2 opacity-80" />
              <p className="text-sm font-bold text-ink/40">No one's checked in yet.</p>
              <p className="text-xs text-ink/30 mt-1">New bookings will show up here in real time.</p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-ink/35 uppercase tracking-wide px-1 -mb-1">
              <Users size={12} /> Currently checked in
            </div>
          )}

          <AnimatePresence mode="popLayout" initial={false}>
            {bookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                now={now}
                editingId={editingId}
                checkingOutId={checkingOutId}
                onEdit={onEdit}
                onCheckout={onCheckout}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
