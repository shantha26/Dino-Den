import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Phone, Star, TrendingUp, Clock, ChevronDown, ChevronUp, X, CheckCircle } from "lucide-react";
import { searchByMobile } from "../api.js";
import MembershipBadge, { MEMBERSHIP_CONFIG } from "./shared/MembershipBadge.jsx";
import VisitCard from "./shared/VisitCard.jsx";

export default function MobileSearch({ onFill }) {
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | not_found | error
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [filled, setFilled] = useState(false);
  const inputRef = useRef(null);

  const handleInput = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setMobile(digits);
    if (status !== "idle") {
      setStatus("idle");
      setResult(null);
      setFilled(false);
      setShowHistory(false);
    }
  };

  const handleSearch = async () => {
    if (mobile.length !== 10) return;
    setStatus("loading");
    setResult(null);
    setShowHistory(false);
    setFilled(false);
    try {
      const { data } = await searchByMobile(mobile);
      if (data.found) {
        setResult(data);
        setStatus("found");
      } else {
        setResult(null);
        setStatus("not_found");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleFill = () => {
    if (!result?.profile) return;
    onFill(result.profile);
    setFilled(true);
  };

  const handleClear = () => {
    setMobile("");
    setStatus("idle");
    setResult(null);
    setFilled(false);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const stats = result?.stats;
  const visits = result?.visits || [];

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-bone rounded-blob shadow-pop border-2 border-fern/20 p-5 md:p-6 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔍</span>
        <h2 className="font-display text-lg md:text-xl text-fern tracking-wide">
          Search by Mobile Number
        </h2>
        <span className="text-xs font-bold text-ink/40 bg-ink/5 rounded-full px-2.5 py-1 ml-auto">
          Returning customer? Look up here first
        </span>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
          <input
            ref={inputRef}
            className="w-full rounded-2xl border-2 border-ink/10 focus:border-fern bg-white pl-10 pr-10 py-3 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none transition-colors text-base"
            placeholder="Enter 10-digit mobile number"
            value={mobile}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            inputMode="numeric"
            maxLength={10}
          />
          {mobile && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <motion.button
          type="button"
          onClick={handleSearch}
          disabled={mobile.length !== 10 || status === "loading"}
          whileTap={{ scale: 0.96 }}
          className="jelly-btn bg-fern text-white font-display text-base px-5 py-3 rounded-2xl shadow-pop active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
        >
          {status === "loading" ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
              <Search size={17} />
            </motion.span>
          ) : (
            <Search size={17} />
          )}
          Search
        </motion.button>
      </div>

      {/* Status messages */}
      <AnimatePresence mode="wait">
        {status === "not_found" && (
          <motion.p
            key="not_found"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-sm font-bold text-amber/80 flex items-center gap-2"
          >
            🦕 No record found for this number — they'll be registered fresh!
          </motion.p>
        )}
        {status === "error" && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-sm font-bold text-lava"
          >
            ⚠️ Search failed — check that the backend is running.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Result panel */}
      <AnimatePresence>
        {status === "found" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t-2 border-dashed border-ink/10">
              {/* Profile row */}
              <div className="flex flex-wrap items-start gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-lg text-ink">{result.profile.parentName}</span>
                    <span className="text-ink/30">·</span>
                    <span className="font-display text-lg text-fern">{result.profile.kidName}</span>
                    <MembershipBadge tier={stats.membership} />
                  </div>
                  <p className="text-sm font-bold text-ink/40 mt-0.5">{result.profile.mobileNumber}</p>
                </div>

                {/* Auto-fill button */}
                <motion.button
                  type="button"
                  onClick={handleFill}
                  disabled={filled}
                  whileTap={{ scale: 0.96 }}
                  className={`jelly-btn font-display text-sm px-4 py-2.5 rounded-2xl shadow-popsm active:shadow-none flex items-center gap-2 shrink-0 transition-colors ${
                    filled
                      ? "bg-fern/15 text-fern border-2 border-fern/30 cursor-default"
                      : "bg-lava text-white"
                  }`}
                >
                  {filled ? (
                    <><CheckCircle size={15} /> Filled!</>
                  ) : (
                    <>✏️ Auto-fill Form</>
                  )}
                </motion.button>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { icon: TrendingUp, label: "Total Visits", value: stats.totalVisits },
                  { icon: Star,       label: "Total Spent",  value: `₹${stats.totalSpent.toFixed(0)}` },
                  { icon: Clock,      label: "Last Visit",   value: stats.lastVisit },
                  { icon: Star,       label: "Membership",   value: `${MEMBERSHIP_CONFIG[stats.membership]?.emoji} ${stats.membership}` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-fern/5 border border-fern/15 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40 flex items-center gap-1">
                      <Icon size={10} /> {label}
                    </span>
                    <span className="font-display text-sm text-ink">{value}</span>
                  </div>
                ))}
              </div>

              {/* Visit history toggle */}
              {visits.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex items-center gap-2 text-sm font-extrabold text-fern hover:text-swamp transition-colors mb-2"
                  >
                    {showHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    {showHistory ? "Hide" : "Show"} visit history ({visits.length} visit{visits.length !== 1 ? "s" : ""})
                  </button>

                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                          {visits.map((v, i) => (
                            <VisitCard key={v._id || i} visit={v} index={i} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
