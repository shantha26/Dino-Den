import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Cake, PartyPopper, Phone, CalendarDays } from "lucide-react";
import { fetchBirthdays } from "../api.js";

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function Birthdays() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchBirthdays();
      setData(data);
    } catch (err) {
      setError(
        err?.response?.data?.error || "Could not load birthdays. Check that the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-ink/60 font-bold py-24">
        <Loader2 className="animate-spin" size={22} /> Loading birthdays...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-lava/10 border-2 border-lava/40 text-lava font-bold rounded-2xl px-5 py-4 flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={load}
          className="jelly-btn flex items-center gap-1.5 bg-lava text-white px-3 py-2 rounded-xl text-sm"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { thisMonth, byMonth, month, today, year } = data;
  const todaysList = thisMonth.filter((k) => k.isToday);
  const restOfMonth = thisMonth.filter((k) => !k.isToday);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl md:text-2xl text-ink tracking-wide flex items-center gap-2">
          🎂 Birthdays
        </h2>
        <button
          onClick={load}
          className="jelly-btn flex items-center gap-1.5 bg-fern text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-popsm active:shadow-none"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* This month — shown separately and prominently */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3 border-l-4 border-lava pl-3">
          <h3 className="font-display text-lg md:text-xl text-ink tracking-wide">
            This Month — {month} {year}
          </h3>
        </div>

        {thisMonth.length === 0 ? (
          <div className="rounded-3xl bg-bone border-2 border-ink/10 shadow-pop px-6 py-10 text-center text-ink/50 font-bold">
            No registered kids have a birthday in {month}.
          </div>
        ) : (
          <>
            {todaysList.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="font-display text-base text-lava flex items-center gap-2">
                  <PartyPopper size={18} /> Today's Birthdays
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todaysList.map((kid) => (
                    <BirthdayCard key={`${kid.mobileNumber}-${kid.kidName}`} kid={kid} highlight />
                  ))}
                </div>
              </div>
            )}

            {restOfMonth.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="font-display text-base text-fern flex items-center gap-2">
                  <Cake size={18} /> Rest of {month}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restOfMonth.map((kid) => (
                    <BirthdayCard key={`${kid.mobileNumber}-${kid.kidName}`} kid={kid} today={today} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Full-year calendar — every month, so staff can plan ahead */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3 border-l-4 border-fern pl-3">
          <h3 className="font-display text-lg md:text-xl text-ink tracking-wide flex items-center gap-2">
            <CalendarDays size={20} /> Full-Year Birthday Calendar
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {byMonth.map((m) => (
            <MonthCard key={m.monthIdx} monthData={m} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MonthCard({ monthData }) {
  const { month, kids, isCurrent } = monthData;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 p-4 flex flex-col gap-2.5 ${
        isCurrent ? "border-fern bg-fern/5" : "border-ink/10 bg-bone"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-base text-ink flex items-center gap-1.5">
          {isCurrent && <span className="text-sm">📍</span>} {month}
        </span>
        <span
          className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
            kids.length > 0 ? "bg-fern/10 text-fern" : "text-ink/30"
          }`}
        >
          {kids.length}
        </span>
      </div>
      {kids.length === 0 ? (
        <p className="text-xs text-ink/35 italic">No birthdays</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {kids.map((kid) => (
            <li
              key={`${kid.mobileNumber}-${kid.kidName}`}
              className={`text-xs font-bold flex items-center justify-between gap-2 ${
                kid.isToday ? "text-lava" : "text-ink/70"
              }`}
            >
              <span className="truncate">
                {kid.isToday ? "🎉 " : ""}
                {kid.kidName}
              </span>
              <span className="text-ink/40 shrink-0">{ordinal(kid.day)}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function BirthdayCard({ kid, highlight = false, today }) {
  const isPast = today != null && kid.day < today;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border-2 shadow-pop p-5 flex flex-col gap-2 ${
        highlight ? "bg-lava/10 border-lava/40" : `bg-bone border-ink/10 ${isPast ? "opacity-60" : ""}`
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{highlight ? "🎉" : "🎂"}</span>
        <span
          className={`text-xs font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${
            highlight ? "bg-lava text-white" : "bg-fern/10 text-fern"
          }`}
        >
          {ordinal(kid.day)} — Turning {kid.turningAge}
        </span>
      </div>
      <p className="font-display text-lg text-ink">{kid.kidName}</p>
      <p className="text-sm font-bold text-ink/50 flex items-center gap-1.5">
        <Phone size={13} /> {kid.mobileNumber}
      </p>
      {highlight && <p className="text-sm font-extrabold text-lava mt-1">🎈 Happy Birthday today!</p>}
    </motion.div>
  );
}
