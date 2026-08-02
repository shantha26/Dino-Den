import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, ComposedChart, Line,
  PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend, AreaChart, Area,
} from "recharts";
import {
  Loader2, RefreshCw, IndianRupee, Users, TrendingUp, Download,
  FileSpreadsheet, Calendar, Clock, Zap, Star, ChevronDown,
} from "lucide-react";
import { fetchStats, fetchCustomers } from "../api.js";
import { getKidPackageBreakdown } from "../utils.js";
import { Brachiosaurus } from "./shared/AnimatedDinosaurs.jsx";

// ─── Palette ──────────────────────────────────────────────────────────────────
const FERN   = "#159957";
const AMBER  = "#E0A63A";
const LAVA   = "#C1552C";
const SWAMP  = "#0E3B26";
const FERNLT = "#54D69C";
const CREAM  = "#FBF3DE";

const CATEGORY_COLORS = {
  "Play Packages": FERN,
  Arcade:          AMBER,
  Gaming:          SWAMP,
  Socks:           LAVA,
};

// ─── Dino decorations (pure SVG, no external images) ─────────────────────────
function DinoFootprint({ className = "" }) {
  return (
    <svg viewBox="0 0 40 50" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="20" cy="40" rx="8" ry="10" opacity="0.15" />
      <ellipse cx="10" cy="20" rx="4" ry="6" opacity="0.12" />
      <ellipse cx="20" cy="14" rx="4" ry="6" opacity="0.12" />
      <ellipse cx="30" cy="20" rx="4" ry="6" opacity="0.12" />
    </svg>
  );
}

function FloatingDino({ delay = 0, x = "50%", size = 32, opacity = 0.07 }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: x, top: "20%", fontSize: size, opacity }}
      animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      🦕
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatINR(n) {
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
}
function pct(part, whole) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}
function shortDate(d) {
  const [, m, day] = (d || "").split("-");
  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(day)} ${months[Number(m)]}`;
}
function shortMonth(m) {
  const [y, mo] = (m || "").split("-");
  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(mo)]} '${(y||"").slice(2)}`;
}
function shortWeek(w) {
  const [, m, d] = (w || "").split("-");
  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `Wk ${Number(d)} ${months[Number(m)]}`;
}
function nowStr() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function escapeCSV(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(headers, rows) {
  return [headers, ...rows].map(r => r.map(escapeCSV).join(",")).join("\r\n");
}
function downloadCSV(filename, headers, rows) {
  const csv = toCSV(headers, rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Build booking CSV from raw customer records
function buildBookingCSV(customers) {
  const headers = [
    "Date","Time In","Time Out","Parent Name","Kid Name","Mobile",
    "Kids & Packages",
    "Half Hr Soft Play","Unlimited Soft Play","Soft Play + Arcade",
    "Arcade Coins","Basketball","PS3 Hours","PS5 Hours",
    "Kid Socks","Adult Socks","Payment Method",
    "Play Package (₹)","Arcade (₹)","Gaming (₹)","Socks (₹)","Grand Total (₹)",
  ];
  const rows = (customers || []).map(c => [
    c.date, c.timeIn, c.timeOut || "",
    c.parentName, c.kidName, c.mobileNumber,
    getKidPackageBreakdown(c)
      .map((k) => `${k.name}: ${k.packages.join(" + ") || "—"}`)
      .join(" | "),
    c.playPackages?.half_hour_soft_play || 0,
    c.playPackages?.unlimited_soft_play || 0,
    c.playPackages?.unlimited_soft_play_arcade || 0,
    c.arcadeCoins || 0, c.basketballQty || 0,
    c.gaming?.ps3Hours || 0, c.gaming?.ps5Hours || 0,
    c.socks?.kidQty || 0, c.socks?.adultQty || 0,
    c.paymentMethod,
    c.billing?.playPackageCost || 0,
    c.billing?.arcadeCost || 0,
    c.billing?.gamingCost || 0,
    c.billing?.socksCost || 0,
    c.billing?.grandTotal || 0,
  ]);
  return { headers, rows };
}

// Build monthly revenue CSV from stats
function buildMonthlyCSV(monthly) {
  const headers = ["Month","Visits","Revenue (₹)"];
  const rows = (monthly || []).map(m => [m.month, m.customers, m.revenue]);
  return { headers, rows };
}

// ─── Tooltip / Axis styles ────────────────────────────────────────────────────
const tooltipStyle = {
  fontFamily: "'Times New Roman', Times, Georgia, serif",
  fontWeight: 700, borderRadius: 16,
  border: "1px solid rgba(21,153,87,0.18)",
  boxShadow: "0 12px 30px -10px rgba(14,59,38,0.28)",
  background: "#FFFBF2", color: "#2A2116",
};
const axisTick = { fontSize: 11, fontWeight: 700, fill: "#2B2216", opacity: 0.65 };

// ─── UI Primitives ────────────────────────────────────────────────────────────
const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

function StatCard({ icon: Icon, label, value, accent, sub, idx = 0 }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      className="tile-lift relative flex items-center gap-4 rounded-2xl bg-bone border-2 border-ink/10 shadow-pop px-5 py-4 overflow-hidden"
    >
      {/* Footprint watermark */}
      <DinoFootprint className="absolute -right-2 -bottom-2 w-14 h-14 text-fern" />
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}22`, color: accent }}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">{label}</p>
        <p className="font-display text-2xl text-ink tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs font-bold text-ink/35 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function Section({ emoji, title, subtitle, children, action }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 border-l-4 border-fern pl-3">
          <div>
            <h3 className="font-display text-lg md:text-xl text-ink tracking-wide flex items-center gap-2">
              {emoji && <span>{emoji}</span>}{title}
            </h3>
            {subtitle && <p className="text-[11px] font-bold text-ink/40 uppercase tracking-widest mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChartCard({ title, subtitle, children, height = 280, action }) {
  return (
    <motion.div
      {...fadeUp}
      className="rounded-3xl bg-bone border-2 border-ink/10 shadow-popsm p-5 md:p-6 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-display text-base md:text-lg text-fern tracking-wide">{title}</h4>
          {subtitle && <p className="text-[11px] font-bold text-ink/40 uppercase tracking-wide mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </motion.div>
  );
}

function DataTable({ columns, rows, striped = true }) {
  return (
    <div className="rounded-2xl border-2 border-ink/10 overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: FERN + "18" }}>
            {columns.map((c, i) => (
              <th key={c} className={`px-4 py-2.5 font-extrabold text-ink/60 uppercase tracking-widest text-[11px] ${i === 0 ? "text-left" : "text-right"}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center py-6 text-sm font-bold text-ink/30 italic">No data yet</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className={striped && i % 2 === 1 ? "bg-ink/[0.025]" : ""}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 font-bold text-ink/80 tabular-nums border-t border-ink/5 ${j === 0 ? "text-left font-display" : "text-right"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CSVButton({ onClick, label = "Export CSV", loading = false }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileTap={{ scale: 0.96 }}
      className="jelly-btn flex items-center gap-1.5 bg-amber text-white text-xs font-bold px-3 py-2 rounded-xl shadow-popsm active:shadow-none disabled:opacity-50"
    >
      <Download size={13} />{label}
    </motion.button>
  );
}

function AutoRefreshBadge({ nextIn, period }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink/40 bg-ink/5 rounded-full px-2.5 py-1">
      <Zap size={10} className="text-amber" />
      Auto-refresh in {nextIn}
    </span>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const REFRESH_MS = 5 * 60 * 1000; // 5 min auto-refresh (simulates "daily updated")

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(REFRESH_MS / 1000);
  const [activeTab, setActiveTab] = useState("overview"); // overview | revenue | bookings | services
  const refreshTimer = useRef(null);
  const countdownTimer = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [{ data: statsData }, { data: custData }] = await Promise.all([
        fetchStats(),
        fetchCustomers(), // all customers (no date filter)
      ]);
      setStats(statsData);
      setAllCustomers(Array.isArray(custData) ? custData : []);
      setLastUpdated(new Date());
      setNextRefresh(REFRESH_MS / 1000);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load dashboard. Check the backend server is running.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Boot load
  useEffect(() => { load(); }, [load]);

  // Auto-refresh loop
  useEffect(() => {
    refreshTimer.current = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(refreshTimer.current);
  }, [load]);

  // Countdown ticker
  useEffect(() => {
    countdownTimer.current = setInterval(() => {
      setNextRefresh(n => n <= 1 ? REFRESH_MS / 1000 : n - 1);
    }, 1000);
    return () => clearInterval(countdownTimer.current);
  }, []);

  // ── CSV downloads ──────────────────────────────────────────────────────────
  const handleDownloadBookings = async () => {
    setCsvLoading(true);
    try {
      const { headers, rows } = buildBookingCSV(allCustomers);
      const today = new Date().toISOString().slice(0, 10);
      downloadCSV(`DinoPlayZone_Bookings_${today}.csv`, headers, rows);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleDownloadRevenue = () => {
    if (!stats) return;
    const { headers, rows } = buildMonthlyCSV(stats.monthly || []);
    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`DinoPlayZone_MonthlyRevenue_${today}.csv`, headers, rows);
  };

  const handleDownloadDaily = () => {
    if (!stats) return;
    const headers = ["Date","Visits","Revenue (₹)"];
    const rows = (stats.daily || []).map(d => [d.date, d.customers, d.revenue]);
    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`DinoPlayZone_DailyRevenue_${today}.csv`, headers, rows);
  };

  const handleDownloadWeekly = () => {
    if (!stats) return;
    const headers = ["Week Starting","Visits","Revenue (₹)"];
    const rows = (stats.weekly || []).map(w => [w.week, w.customers, w.revenue]);
    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`DinoPlayZone_WeeklyRevenue_${today}.csv`, headers, rows);
  };

  const handleDownloadServices = () => {
    if (!stats) return;
    const headers = ["Service","Category","Qty Sold","Revenue (₹)","Share"];
    const total = (stats.packages || []).reduce((s, p) => s + p.revenue, 0);
    const rows = (stats.packages || []).map(p => [p.name, p.category, p.qty, p.revenue, pct(p.revenue, total)]);
    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`DinoPlayZone_ServiceRevenue_${today}.csv`, headers, rows);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const daily    = (stats?.daily   || []).map(d => ({ ...d, label: shortDate(d.date) }));
  const weekly   = (stats?.weekly  || []).map(w => ({ ...w, label: shortWeek(w.week) }));
  const monthly  = (stats?.monthly || []).map(m => ({ ...m, label: shortMonth(m.month) }));
  const packages = stats?.packages || [];
  const payments = (stats?.payments || []).map(p => ({
    ...p,
    label: p.method === "gpay" ? "GPay" : p.method === "split" ? "Split" : "Cash",
    color: p.method === "gpay" ? AMBER : p.method === "split" ? LAVA : FERN,
  })).filter(p => p.count > 0 || p.revenue > 0);

  const totalCustomers   = stats?.totals?.customers || 0;
  const totalRevenue     = stats?.totals?.revenue   || 0;
  const avgTicket        = totalCustomers ? totalRevenue / totalCustomers : 0;
  const payTotalRev      = payments.reduce((s, p) => s + p.revenue, 0);
  const pkgTotalRev      = packages.reduce((s, p) => s + p.revenue, 0);

  // Today stats from daily array
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = daily.find(d => d.date === today) || { customers: 0, revenue: 0 };
  const todayRev  = todayEntry.revenue   || 0;
  const todayVisits = todayEntry.customers || 0;

  // This month
  const thisMonthKey = today.slice(0, 7);
  const thisMonthEntry = (stats?.monthly || []).find(m => m.month === thisMonthKey) || {};
  const thisMonthRev = thisMonthEntry.revenue || 0;

  // ── Nav tabs ───────────────────────────────────────────────────────────────
  const TABS = [
    { key: "overview",  label: "📊 Overview"  },
    { key: "revenue",   label: "💰 Revenue"   },
    { key: "bookings",  label: "📋 Bookings"  },
    { key: "services",  label: "🦖 Services"  },
  ];

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <motion.span
          className="text-5xl"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >🦕</motion.span>
        <span className="font-display text-lg text-fern flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} /> Loading the Dino Dashboard…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-lava/10 border-2 border-lava/40 text-lava font-bold rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦴</span>
          <span>{error}</span>
        </div>
        <button
          onClick={() => load()}
          className="jelly-btn flex items-center gap-1.5 bg-lava text-white px-3 py-2 rounded-xl text-sm shrink-0"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="relative rounded-blob overflow-hidden bg-jungle-gradient px-6 py-6 md:py-8 shadow-pop">
        <FloatingDino delay={0}  x="72%" size={38} opacity={0.13} />
        <FloatingDino delay={2}  x="85%" size={22} opacity={0.08} />
        <FloatingDino delay={1}  x="60%" size={26} opacity={0.07} />
        <div className="hidden md:block absolute -bottom-3 right-4 opacity-90">
          <Brachiosaurus className="w-20 h-24" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-display text-2xl md:text-3xl text-cream tracking-wide flex items-center gap-3"
            >
              <motion.span
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >🦖</motion.span>
              Business Dashboard
            </motion.h2>
            <p className="text-cream/60 text-xs font-bold uppercase tracking-widest mt-1">
              Dino Play Zone — Revenue & Analytics
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <AutoRefreshBadge
              nextIn={nextRefresh >= 60 ? `${Math.floor(nextRefresh / 60)}m ${nextRefresh % 60}s` : `${nextRefresh}s`}
            />
            {lastUpdated && (
              <span className="text-[11px] font-bold text-cream/50 flex items-center gap-1">
                <Clock size={11} /> {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <motion.button
              onClick={() => load()}
              whileTap={{ scale: 0.93 }}
              className="jelly-btn flex items-center gap-1.5 bg-cream text-fern px-3.5 py-2 rounded-xl text-sm font-bold shadow-popsm active:shadow-none"
            >
              <RefreshCw size={13} /> Refresh
            </motion.button>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="relative z-10 flex gap-1.5 mt-5 flex-wrap">
          {TABS.map(({ key, label }) => (
            <motion.button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-xl font-display text-sm tracking-wide transition-colors ${
                activeTab === key
                  ? "bg-cream text-fern shadow-popsm"
                  : "text-cream/70 hover:text-cream bg-black/10"
              }`}
            >
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── KPI Strip (always visible) ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard idx={0} icon={Users}       label="Total Visits"      value={totalCustomers}       accent={FERN}  sub={`${todayVisits} today`} />
        <StatCard idx={1} icon={IndianRupee} label="Total Revenue"     value={formatINR(totalRevenue)} accent={AMBER} sub={`${formatINR(todayRev)} today`} />
        <StatCard idx={2} icon={TrendingUp}  label="Avg Ticket"        value={formatINR(avgTicket)} accent={LAVA}  sub="per booking" />
        <StatCard idx={3} icon={Calendar}    label="This Month"        value={formatINR(thisMonthRev)} accent={SWAMP} sub={shortMonth(thisMonthKey)} />
      </div>

      {/* ── Tab Panels ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <motion.div key="overview" {...fadeUp} className="flex flex-col gap-8">
            {/* Payment split */}
            <Section emoji="💳" title="Payment Methods" subtitle="Cash vs GPay revenue and visit split">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <ChartCard title="Revenue Split" subtitle="By payment method" height={240}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={payments} dataKey="revenue" nameKey="label" cx="50%" cy="50%" outerRadius={80}
                        label={e => `${e.label}: ${pct(e.revenue, payTotalRev)}`}
                        labelLine={{ stroke: FERN, strokeWidth: 1 }}
                      >
                        {payments.map(p => <Cell key={p.method} fill={p.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle}
                        formatter={(v, n, props) => [`${formatINR(v)} (${props.payload.count} visits)`, props.payload.label]} />
                      <Legend wrapperStyle={{ fontWeight: 700, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
                <DataTable
                  columns={["Method","Visits","Revenue","Share"]}
                  rows={payments.map(p => [p.label, p.count, formatINR(p.revenue), pct(p.revenue, payTotalRev)])}
                />
              </div>
            </Section>

            {/* Top services summary */}
            <Section emoji="🏆" title="Top Services" subtitle="Revenue contribution ranking">
              <DataTable
                columns={["Service","Category","Qty","Revenue","Share"]}
                rows={packages.slice(0, 6).map(p => [p.name, p.category, p.qty, formatINR(p.revenue), pct(p.revenue, pkgTotalRev)])}
              />
            </Section>

            {/* Recent daily */}
            <Section emoji="📅" title="Last 7 Days" subtitle="Quick daily snapshot"
              action={<CSVButton onClick={handleDownloadDaily} label="Daily CSV" />}
            >
              <DataTable
                columns={["Date","Visits","Revenue"]}
                rows={[...daily].reverse().slice(0, 7).map(d => [d.date, d.customers, formatINR(d.revenue)])}
              />
            </Section>
          </motion.div>
        )}

        {/* ── REVENUE ── */}
        {activeTab === "revenue" && (
          <motion.div key="revenue" {...fadeUp} className="flex flex-col gap-8">
            <Section emoji="📈" title="Revenue Trends"
              action={
                <div className="flex gap-2 flex-wrap">
                  <CSVButton onClick={handleDownloadDaily}   label="Daily CSV"   />
                  <CSVButton onClick={handleDownloadWeekly}  label="Weekly CSV"  />
                  <CSVButton onClick={handleDownloadRevenue} label="Monthly CSV" />
                </div>
              }
            >
              {/* Daily */}
              <ChartCard title="Daily Revenue" subtitle="Last 14 days — auto-updated every 5 min" height={280}>
                <ResponsiveContainer>
                  <AreaChart data={daily} margin={{ left: 4, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="fernGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={FERN} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={FERN} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,34,22,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} />
                    <YAxis tick={axisTick} tickFormatter={v => `₹${v}`} width={58} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [formatINR(v), "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke={FERN} strokeWidth={2.5} fill="url(#fernGrad)" name="Revenue" dot={{ r: 3, fill: FERN }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Weekly */}
              <ChartCard title="Weekly Revenue & Visits" subtitle="Last 8 weeks" height={280}>
                <ResponsiveContainer>
                  <ComposedChart data={weekly} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,34,22,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10 }} />
                    <YAxis yAxisId="left"  tick={axisTick} tickFormatter={v => `₹${v}`} width={58} />
                    <YAxis yAxisId="right" orientation="right" tick={axisTick} allowDecimals={false} width={32} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v, n) => n === "Revenue" ? [formatINR(v), n] : [v, n]} />
                    <Legend wrapperStyle={{ fontWeight: 700, fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="revenue" fill={AMBER} radius={[5, 5, 0, 0]} name="Revenue" maxBarSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="customers" stroke={LAVA} strokeWidth={2.5} name="Visits" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Monthly */}
              <ChartCard title="Monthly Revenue & Visits" subtitle="Last 12 months" height={280}>
                <ResponsiveContainer>
                  <ComposedChart data={monthly} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,34,22,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10 }} />
                    <YAxis yAxisId="left"  tick={axisTick} tickFormatter={v => `₹${v}`} width={58} />
                    <YAxis yAxisId="right" orientation="right" tick={axisTick} allowDecimals={false} width={32} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v, n) => n === "Revenue" ? [formatINR(v), n] : [v, n]} />
                    <Legend wrapperStyle={{ fontWeight: 700, fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="revenue" fill={FERN} radius={[5, 5, 0, 0]} name="Revenue" maxBarSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="customers" stroke={LAVA} strokeWidth={2.5} name="Visits" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Monthly data table */}
              <DataTable
                columns={["Month","Visits","Revenue"]}
                rows={[...monthly].reverse().map(m => [m.label, m.customers, formatINR(m.revenue)])}
              />
            </Section>
          </motion.div>
        )}

        {/* ── BOOKINGS ── */}
        {activeTab === "bookings" && (
          <motion.div key="bookings" {...fadeUp} className="flex flex-col gap-8">
            <Section emoji="📋" title="Customer Bookings"
              subtitle={`${allCustomers.length} total records`}
              action={
                <motion.button
                  type="button"
                  onClick={handleDownloadBookings}
                  disabled={csvLoading}
                  whileTap={{ scale: 0.96 }}
                  className="jelly-btn flex items-center gap-2 bg-fern text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-popsm active:shadow-none disabled:opacity-50"
                >
                  <FileSpreadsheet size={15} />
                  {csvLoading ? "Preparing…" : "Download All Bookings (CSV)"}
                </motion.button>
              }
            >
              {/* Recent bookings table */}
              <div className="rounded-2xl border-2 border-ink/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[720px]">
                    <thead>
                      <tr style={{ background: FERN + "18" }}>
                        {["Date","Time In","Kid","Mobile","Packages","Total","Payment"].map((c, i) => (
                          <th key={c} className={`px-3 py-2.5 font-extrabold text-ink/60 uppercase tracking-widest text-[11px] ${i === 0 ? "text-left" : i < 4 ? "text-left" : "text-right"}`}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allCustomers.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-10 font-bold text-ink/30 italic">No bookings recorded yet</td></tr>
                      ) : allCustomers.slice(0, 50).map((c, i) => {
                        const breakdown = getKidPackageBreakdown(c);
                        return (
                          <tr key={c._id || i} className={i % 2 === 1 ? "bg-ink/[0.025]" : ""}>
                            <td className="px-3 py-2 font-display border-t border-ink/5 text-sm whitespace-nowrap">{c.date}</td>
                            <td className="px-3 py-2 border-t border-ink/5 text-sm whitespace-nowrap text-ink/60 font-bold">{c.timeIn}</td>
                            <td className="px-3 py-2 border-t border-ink/5 font-bold text-fern">
                              {breakdown.map((k, ix) => (
                                <div key={ix} className="whitespace-nowrap">{k.name}</div>
                              ))}
                            </td>
                            <td className="px-3 py-2 border-t border-ink/5 font-bold text-ink/50 tabular-nums">{c.mobileNumber}</td>
                            <td className="px-3 py-2 border-t border-ink/5 text-xs font-bold text-ink/60">
                              {breakdown.map((k, ix) => (
                                <div key={ix} className="whitespace-nowrap">{k.packages.join(", ") || "–"}</div>
                              ))}
                            </td>
                            <td className="px-3 py-2 border-t border-ink/5 text-right font-display text-fern tabular-nums">{formatINR(c.billing?.grandTotal)}</td>
                            <td className="px-3 py-2 border-t border-ink/5 text-right">
                              <span
                                className={`text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                  c.paymentMethod === "split"
                                    ? "bg-lava/10 text-lava"
                                    : c.paymentMethod === "gpay"
                                    ? "bg-amber/15 text-amber"
                                    : "bg-fern/10 text-fern"
                                }`}
                              >
                                {c.paymentMethod === "split"
                                  ? `Split (💵${c.splitPayment?.cashAmount ?? 0} + 📱${c.splitPayment?.gpayAmount ?? 0})`
                                  : c.paymentMethod === "gpay"
                                  ? "GPay"
                                  : "Cash"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {allCustomers.length > 50 && (
                  <div className="px-4 py-3 bg-ink/[0.025] text-center text-xs font-bold text-ink/40">
                    Showing 50 of {allCustomers.length} records · Download CSV for full data
                  </div>
                )}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ── SERVICES ── */}
        {activeTab === "services" && (
          <motion.div key="services" {...fadeUp} className="flex flex-col gap-8">
            <Section emoji="🦕" title="Service Performance"
              subtitle="Revenue by package, ranked highest to lowest"
              action={<CSVButton onClick={handleDownloadServices} label="Export CSV" />}
            >
              <ChartCard title="Revenue by Service" subtitle="Horizontal bar — all time" height={Math.max(280, packages.length * 46 + 60)}>
                <ResponsiveContainer>
                  <BarChart data={packages} layout="vertical" margin={{ left: 16, right: 32, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,34,22,0.08)" horizontal={false} />
                    <XAxis type="number" tick={axisTick} tickFormatter={v => `₹${v}`} />
                    <YAxis type="category" dataKey="name" width={200} tick={{ ...axisTick, fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v, n, props) => [`${formatINR(v)} (qty: ${props.payload.qty})`, props.payload.category]} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {packages.map(p => <Cell key={p.name} fill={CATEGORY_COLORS[p.category] || FERN} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs font-bold text-ink/50 px-1">
                {Object.entries(CATEGORY_COLORS).map(([label, color]) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>

              {/* Full table */}
              <DataTable
                columns={["Service","Category","Qty Sold","Revenue","Share"]}
                rows={packages.map(p => [p.name, p.category, p.qty, formatINR(p.revenue), pct(p.revenue, pkgTotalRev)])}
              />
            </Section>

            {/* Weekly bookings bar */}
            <Section emoji="📆" title="Weekly Booking Activity"
              subtitle="Customer count per week"
              action={<CSVButton onClick={handleDownloadWeekly} label="Weekly CSV" />}
            >
              <ChartCard title="Customers Per Week" subtitle="Last 8 weeks" height={240}>
                <ResponsiveContainer>
                  <BarChart data={weekly} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,34,22,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10 }} />
                    <YAxis tick={axisTick} allowDecimals={false} width={32} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [v, "Customers"]} />
                    <Bar dataKey="customers" fill={SWAMP} radius={[5, 5, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Section>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Floating dino footer ───────────────────────────────────────────── */}
      <motion.div
        className="text-center text-ink/20 text-3xl py-2 select-none"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        🦴 🦖 🦴
      </motion.div>
    </div>
  );
}
