import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock, Cake, Users, Ticket, LogOut, X as XIcon } from "lucide-react";

function Section({ icon: Icon, iconClass, title, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40 flex items-center gap-1.5 px-1">
        <Icon size={11} className={iconClass} /> {title}
      </p>
      {children}
    </div>
  );
}

export default function NotificationBell({
  dueCheckouts = [],
  onCheckout,
  onDismissDue,
  todaysBirthdays = [],
  waitlistStatus,
  liveOffers = [],
  onGoToWaitlist,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const urgentCount =
    dueCheckouts.length + todaysBirthdays.length + (waitlistStatus?.isFull ? waitlistStatus.waitingCount || 1 : 0);
  const hasAnything = urgentCount > 0 || liveOffers.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative text-cream/90 hover:text-cream transition-colors p-1.5"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-lava text-white text-[10px] font-extrabold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {urgentCount > 9 ? "9+" : urgentCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-y-auto bg-bone rounded-2xl shadow-pop border-2 border-ink/10 p-3 flex flex-col gap-3 z-50 text-ink"
          >
            {!hasAnything && (
              <p className="text-sm font-bold text-ink/40 text-center py-6">🦕 All quiet — nothing new.</p>
            )}

            {dueCheckouts.length > 0 && (
              <Section icon={Clock} iconClass="text-amber" title="Play Time Completed">
                <div className="flex flex-col gap-1.5">
                  {dueCheckouts.map((item) => (
                    <div
                      key={item.customer._id}
                      className="flex items-center justify-between gap-2 bg-amber/10 border border-amber/25 rounded-xl px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-display text-sm text-ink truncate">{item.customer.kidName}</p>
                        <p className="text-[11px] font-bold text-ink/50">{item.packageLabel}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onCheckout?.(item)}
                          className="jelly-btn bg-fern text-white text-[11px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <LogOut size={11} /> Out
                        </button>
                        <button type="button" onClick={() => onDismissDue?.(item)} className="text-ink/30 hover:text-ink/60">
                          <XIcon size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {todaysBirthdays.length > 0 && (
              <Section icon={Cake} iconClass="text-lava" title="Birthday Today">
                <div className="flex flex-col gap-1.5">
                  {todaysBirthdays.map((kid) => (
                    <div
                      key={`${kid.mobileNumber}-${kid.kidName}`}
                      className="bg-lava/10 border border-lava/25 rounded-xl px-3 py-2"
                    >
                      <p className="font-display text-sm text-ink">🎉 {kid.kidName}</p>
                      <p className="text-[11px] font-bold text-ink/50">Turning {kid.turningAge} · {kid.mobileNumber}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {waitlistStatus?.isFull && (
              <Section icon={Users} iconClass="text-lava" title="Play Area Full">
                <button
                  type="button"
                  onClick={() => { setOpen(false); onGoToWaitlist?.(); }}
                  className="w-full text-left bg-lava/10 border border-lava/25 rounded-xl px-3 py-2 hover:bg-lava/15 transition-colors"
                >
                  <p className="font-display text-sm text-lava">
                    🔴 {waitlistStatus.currentOccupancy}/{waitlistStatus.capacity} — at capacity
                  </p>
                  <p className="text-[11px] font-bold text-ink/50">
                    {waitlistStatus.waitingCount} waiting · Tap to open the waitlist
                  </p>
                </button>
              </Section>
            )}

            {liveOffers.length > 0 && (
              <Section icon={Ticket} iconClass="text-fern" title="Offers & Coupons">
                <div className="flex flex-col gap-1.5">
                  {liveOffers.map((o) => (
                    <div key={o.code} className="bg-fern/8 border border-fern/20 rounded-xl px-3 py-2">
                      <p className="font-display text-sm text-fern">
                        {o.isFestival ? "🎊 " : "🏷️ "}{o.code}
                      </p>
                      <p className="text-[11px] font-bold text-ink/50">
                        {o.type === "flat" ? `₹${o.value} off` : `${o.value}% off`}
                        {o.festivalName ? ` · ${o.festivalName}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
