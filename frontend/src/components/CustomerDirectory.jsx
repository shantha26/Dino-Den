import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Phone, Star, TrendingUp, Clock, ChevronDown, ChevronUp,
  X, Loader2, RefreshCw, Gift, Cake, Users,
} from "lucide-react";
import { fetchCustomerDirectory, searchByMobile } from "../api.js";
import MembershipBadge from "./shared/MembershipBadge.jsx";
import VisitCard from "./shared/VisitCard.jsx";
import { TRex } from "./shared/AnimatedDinosaurs.jsx";

const SORT_OPTIONS = [
  { key: "recent", label: "Most Recent" },
  { key: "visits", label: "Most Visits" },
  { key: "spent", label: "Highest Spend" },
  { key: "points", label: "Loyalty Points" },
  { key: "birthday", label: "Upcoming Birthday" },
  { key: "name", label: "Name (A–Z)" },
];

function birthdayLabel(days) {
  if (days == null) return null;
  if (days === 0) return { text: "🎉 Birthday today!", urgent: true };
  if (days <= 30) return { text: `🎂 in ${days} day${days === 1 ? "" : "s"}`, urgent: days <= 7 };
  return null;
}

function CustomerCard({ c, expanded, onToggle, visits, visitsLoading }) {
  const bday = birthdayLabel(c.birthdayInDays);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bone rounded-3xl border-2 border-ink/10 shadow-pop overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-5 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-lg text-ink">{c.parentName}</span>
              <span className="text-ink/30">·</span>
              <span className="font-display text-lg text-fern">
                {c.kidNames.length > 1 ? c.kidNames.join(", ") : c.kidName}
              </span>
            </div>
            <p className="text-sm font-bold text-ink/40 mt-0.5 flex items-center gap-1.5">
              <Phone size={12} /> {c.mobileNumber}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MembershipBadge tier={c.membership} />
            {expanded ? <ChevronUp size={18} className="text-ink/40" /> : <ChevronDown size={18} className="text-ink/40" />}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: TrendingUp, label: "Visits", value: c.totalVisits },
            { icon: Star, label: "Spent", value: `₹${c.totalSpent.toFixed(0)}` },
            { icon: Gift, label: "Points", value: c.loyaltyPoints },
            { icon: Clock, label: "Last Visit", value: c.lastVisit || "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-fern/5 border border-fern/15 rounded-xl px-3 py-2 flex flex-col gap-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40 flex items-center gap-1">
                <Icon size={10} /> {label}
              </span>
              <span className="font-display text-sm text-ink">{value}</span>
            </div>
          ))}
        </div>

        {bday && (
          <span
            className={`inline-flex w-fit items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full ${
              bday.urgent ? "bg-lava text-white" : "bg-amber/15 text-amber"
            }`}
          >
            {bday.text}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t-2 border-dashed border-ink/10">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ink/40 mb-2 mt-3">
                Previous Bookings
              </p>
              {visitsLoading ? (
                <div className="flex items-center gap-2 text-ink/50 font-bold py-4 text-sm">
                  <Loader2 className="animate-spin" size={16} /> Loading visit history...
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {(visits || []).map((v, i) => (
                    <VisitCard key={v._id || i} visit={v} index={i} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CustomerDirectory() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [expandedMobile, setExpandedMobile] = useState(null);
  const [visitsByMobile, setVisitsByMobile] = useState({});
  const [visitsLoading, setVisitsLoading] = useState(false);
  const debounceRef = useRef(null);

  const load = async (q = query, s = sort) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchCustomerDirectory({ q: q || undefined, sort: s });
      setCustomers(data.customers || []);
    } catch (err) {
      setError(
        err?.response?.data?.error || "Could not load customers. Check that the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value, sort), 350);
  };

  const handleSortChange = (key) => {
    setSort(key);
    load(query, key);
  };

  const toggleExpand = async (c) => {
    if (expandedMobile === c.mobileNumber) {
      setExpandedMobile(null);
      return;
    }
    setExpandedMobile(c.mobileNumber);
    if (!visitsByMobile[c.mobileNumber]) {
      setVisitsLoading(true);
      try {
        const { data } = await searchByMobile(c.mobileNumber);
        setVisitsByMobile((m) => ({ ...m, [c.mobileNumber]: data.visits || [] }));
      } catch {
        setVisitsByMobile((m) => ({ ...m, [c.mobileNumber]: [] }));
      } finally {
        setVisitsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl md:text-2xl text-ink tracking-wide flex items-center gap-2">
          <Users size={24} className="text-fern" /> Customers
        </h2>
        <button
          onClick={() => load()}
          className="jelly-btn flex items-center gap-1.5 bg-fern text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-popsm active:shadow-none"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search + sort bar */}
      <div className="bg-bone rounded-blob shadow-pop border-2 border-fern/20 p-4 md:p-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
          <input
            className="w-full rounded-2xl border-2 border-ink/10 focus:border-fern bg-white pl-10 pr-10 py-3 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none transition-colors text-base"
            placeholder="Search by parent name, kid name, or mobile number"
            value={query}
            onChange={handleQueryChange}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); load("", sort); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded-2xl border-2 border-ink/10 focus:border-fern bg-white px-4 py-3 font-body font-semibold text-ink focus:outline-none transition-colors text-sm shrink-0"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>Sort: {opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-ink/60 font-bold py-24">
          <Loader2 className="animate-spin" size={22} /> Loading customers...
        </div>
      ) : error ? (
        <div className="bg-lava/10 border-2 border-lava/40 text-lava font-bold rounded-2xl px-5 py-4 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => load()}
            className="jelly-btn flex items-center gap-1.5 bg-lava text-white px-3 py-2 rounded-xl text-sm"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-3xl bg-bone border-2 border-ink/10 shadow-pop px-6 py-10 flex flex-col items-center gap-2 text-center text-ink/50 font-bold">
          <TRex className="w-16 h-16 opacity-80" />
          {query ? "No customers match that search." : "No customers registered yet."}
        </div>
      ) : (
        <>
          <p className="text-sm font-bold text-ink/40">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-col gap-3">
            {customers.map((c) => (
              <CustomerCard
                key={c.mobileNumber}
                c={c}
                expanded={expandedMobile === c.mobileNumber}
                onToggle={() => toggleExpand(c)}
                visits={visitsByMobile[c.mobileNumber]}
                visitsLoading={visitsLoading && expandedMobile === c.mobileNumber && !visitsByMobile[c.mobileNumber]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
