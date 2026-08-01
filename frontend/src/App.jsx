import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ClipboardList, Cake, Users, Ticket, Percent, Settings as SettingsIcon } from "lucide-react";
import CustomerForm from "./components/CustomerForm.jsx";
import PlayPackages from "./components/PlayPackages.jsx";
import Gaming from "./components/Gaming.jsx";
import Socks from "./components/Socks.jsx";
import PaymentMethod from "./components/PaymentMethod.jsx";
import BillingSummary from "./components/BillingSummary.jsx";
import MobileSearch from "./components/MobileSearch.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Birthdays from "./components/Birthdays.jsx";
import CustomerDirectory from "./components/CustomerDirectory.jsx";
import WaitlistPanel from "./components/WaitlistPanel.jsx";
import OffersManager from "./components/OffersManager.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import AdminPinModal from "./components/AdminPinModal.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import BirthdayPopup from "./components/BirthdayPopup.jsx";
import TimeoutAlert from "./components/TimeoutAlert.jsx";
import ActiveBookingsPanel from "./components/ActiveBookingsPanel.jsx";
import DinoBackground from "./components/shared/DinoBackground.jsx";
import { Pterodactyl } from "./components/shared/AnimatedDinosaurs.jsx";
import { computeTotals, computeNewAdditions } from "./pricing.js";
import { useSettings } from "./context/SettingsContext.jsx";
import { useAuth, ROLE_HOME_TAB } from "./context/AuthContext.jsx";
import {
  createCustomer, fetchBirthdays, fetchCustomers, updateCustomer,
  fetchWaitlistStatus, fetchLiveOffers,
} from "./api.js";
import { formatLocalDate, formatLocalTime, calculateAge, toDateInputValue, TIMED_PACKAGES } from "./utils.js";
import UserMenu from "./components/UserMenu.jsx";

// Which roles can see/use each module. Tabs not listed here for a role are
// hidden entirely from that role's nav — not just blocked after the fact.
const TAB_ROLES = {
  booking: ["admin", "manager", "cashier"],
  dashboard: ["admin", "manager"],
  customers: ["admin", "manager", "cashier"],
  waitlist: ["admin", "manager", "cashier"],
  offers: ["admin", "manager"],
  birthdays: ["admin", "manager", "cashier"],
  settings: ["admin"],
};

// Packages that have a fixed play duration — once this many minutes pass
// after check-in, staff get an automatic pop-up reminder to check the kid out.
// (Config now lives in utils.js so the Active Bookings panel can share it.)

const emptyCustomer = () => ({
  parentName: "",
  kidName: "",
  mobileNumber: "",
  dob: "",
  date: formatLocalDate(),
  timeIn: formatLocalTime(),
  timeOut: "",
  paymentMethod: "cash",
  splitPayment: { cashAmount: 0, gpayAmount: 0 }, // only meaningful when paymentMethod === "split"
  additionalKids: [], // siblings on the same booking: [{ kidName, dob, package }] — package is UI-only, synced into order.playPackages
});

const emptyOrder = {
  playPackages: {
    half_hour_soft_play: 0,
    unlimited_soft_play: 0,
    unlimited_soft_play_arcade: 0,
  },
  arcadeCoins: 0,
  basketballQty: 0,
  gaming: { ps3Hours: 0, ps5Hours: 0 },
  socks: { kidQty: 0, adultQty: 0 },
  discount: 0,
  promoCode: "",
};

export default function App() {
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const role = user?.role || "cashier";
  const [activeTab, setActiveTab] = useState(() => ROLE_HOME_TAB[role] || "booking");
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [order, setOrder] = useState(emptyOrder);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [todaysBirthdays, setTodaysBirthdays] = useState([]);
  const [dueCheckouts, setDueCheckouts] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [waitlistStatus, setWaitlistStatus] = useState(null);
  const [liveOffers, setLiveOffers] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState(null); // full booking doc being edited, or null for a fresh booking
  const [checkingOutId, setCheckingOutId] = useState(null);
  const checkoutTimers = useRef(new Map()); // bookingId -> setTimeout handle

  // Today's checked-in-but-not-checked-out bookings, for the Active Bookings
  // panel. Polled on an interval so a checkout from another till, or a timed
  // package tipping over into "Due", shows up without a manual refresh.
  const loadActiveBookings = () => {
    fetchCustomers(formatLocalDate())
      .then(({ data }) => setActiveBookings((data || []).filter((c) => !c.timeOut)))
      .catch(() => {})
      .finally(() => setActiveLoading(false));
  };

  useEffect(() => {
    loadActiveBookings();
    const interval = setInterval(loadActiveBookings, 20000);
    return () => clearInterval(interval);
  }, []);

  // Check once on load whether any registered kid's birthday is today, so
  // staff get a heads-up pop-up regardless of which tab they land on.
  useEffect(() => {
    fetchBirthdays()
      .then(({ data }) => setTodaysBirthdays(data.todaysBirthdays || []))
      .catch(() => {});
  }, []);

  // Keep the play-area capacity status fresh for the notification bell and
  // the "we're full" banner on the booking tab.
  useEffect(() => {
    const loadStatus = () => {
      fetchWaitlistStatus(formatLocalDate())
        .then(({ data }) => setWaitlistStatus(data))
        .catch(() => {});
    };
    loadStatus();
    const interval = setInterval(loadStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  // Currently-valid promo/festival codes, surfaced in the notification bell.
  useEffect(() => {
    const loadOffers = () => {
      fetchLiveOffers(formatLocalDate())
        .then(({ data }) => setLiveOffers(data || []))
        .catch(() => {});
    };
    loadOffers();
    const interval = setInterval(loadOffers, 60000);
    return () => clearInterval(interval);
  }, []);

  // Schedules a pop-up reminder for a booking that includes a timed package
  // (e.g. Half Hour Soft Play), firing exactly `minutes` after check-in —
  // immediately if that time has already passed (e.g. right after a refresh).
  const scheduleCheckoutReminder = (bookingDoc) => {
    if (!bookingDoc || !bookingDoc._id || bookingDoc.timeOut) return;
    const timedKey = Object.keys(TIMED_PACKAGES).find(
      (key) => (bookingDoc.playPackages?.[key] || 0) > 0
    );
    if (!timedKey) return;
    if (checkoutTimers.current.has(bookingDoc._id)) return;

    const { minutes, label } = TIMED_PACKAGES[timedKey];
    const checkInAt = new Date(`${bookingDoc.date}T${bookingDoc.timeIn}:00`);
    if (Number.isNaN(checkInAt.getTime())) return;
    const dueAt = checkInAt.getTime() + minutes * 60 * 1000;
    const msRemaining = dueAt - Date.now();

    const fire = () => {
      setDueCheckouts((list) =>
        list.some((d) => d.customer._id === bookingDoc._id)
          ? list
          : [...list, { customer: bookingDoc, packageLabel: label }]
      );
    };

    if (msRemaining <= 0) {
      fire();
    } else {
      const handle = setTimeout(fire, msRemaining);
      checkoutTimers.current.set(bookingDoc._id, handle);
    }
  };

  // On load, pick up any of today's bookings that already have a timed
  // package running (e.g. the page was refreshed mid-session) and resume
  // their reminder countdowns.
  useEffect(() => {
    fetchCustomers(formatLocalDate())
      .then(({ data }) => {
        (data || []).forEach((c) => scheduleCheckoutReminder(c));
      })
      .catch(() => {});

    return () => {
      checkoutTimers.current.forEach((handle) => clearTimeout(handle));
      checkoutTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async (item) => {
    const { _id, __v, createdAt, updatedAt, billing, ...bookingFields } = item.customer;
    try {
      await updateCustomer(_id, { ...bookingFields, timeOut: formatLocalTime() });
    } catch {
      // If the request fails the booking simply stays open in the system —
      // staff can still check the kid out manually from the booking list.
    }
    setDueCheckouts((list) => list.filter((d) => d.customer._id !== _id));
    setActiveBookings((list) => list.filter((b) => b._id !== _id));
    if (editingBooking?._id === _id) handleCancelEdit();
  };

  const handleDismissDue = (item) => {
    setDueCheckouts((list) => list.filter((d) => d.customer._id !== item.customer._id));
  };

  // Loads an existing active booking back into the form/order state so
  // staff can add services (e.g. Arcade Coins on a Soft-Play-only booking)
  // or fix a mistake, without creating a duplicate registration. The form's
  // live date/time ticker is frozen so it doesn't overwrite the booking's
  // original check-in time while it's being edited.
  const handleEditBooking = (booking) => {
    setError("");
    setSaved(false);
    dateTouched.current = true;
    timeTouched.current = true;
    setEditingBooking(booking);
    setCustomer({
      parentName: booking.parentName || "",
      kidName: booking.kidName || "",
      mobileNumber: booking.mobileNumber || "",
      dob: toDateInputValue(booking.dob),
      date: booking.date,
      timeIn: booking.timeIn,
      timeOut: booking.timeOut || "",
      paymentMethod: booking.paymentMethod || "cash",
      splitPayment: booking.splitPayment || { cashAmount: 0, gpayAmount: 0 },
      additionalKids: (booking.additionalKids || []).map((k) => ({
        kidName: k.kidName || "",
        dob: toDateInputValue(k.dob),
        package: k.package || "",
      })),
    });
    setOrder({
      playPackages: {
        half_hour_soft_play: booking.playPackages?.half_hour_soft_play || 0,
        unlimited_soft_play: booking.playPackages?.unlimited_soft_play || 0,
        unlimited_soft_play_arcade: booking.playPackages?.unlimited_soft_play_arcade || 0,
      },
      arcadeCoins: booking.arcadeCoins || 0,
      basketballQty: booking.basketballQty || 0,
      gaming: { ps3Hours: booking.gaming?.ps3Hours || 0, ps5Hours: booking.gaming?.ps5Hours || 0 },
      socks: { kidQty: booking.socks?.kidQty || 0, adultQty: booking.socks?.adultQty || 0 },
      discount: booking.billing?.discountAmount || 0,
      promoCode: booking.billing?.promoCode || "",
    });
    setAppliedPromo(
      booking.billing?.promoCode
        ? { code: booking.billing.promoCode, type: null, value: null, discountAmount: booking.billing.discountAmount || 0 }
        : null
    );
  };

  const handleCancelEdit = () => {
    setEditingBooking(null);
    setCustomer(emptyCustomer());
    setOrder(emptyOrder);
    setAppliedPromo(null);
    setError("");
    dateTouched.current = false;
    timeTouched.current = false;
  };

  // "Check Out" from the Active Bookings panel — same effect as the timed
  // reminder's checkout, but reachable any time, for any active booking.
  const handleCheckoutFromPanel = async (booking) => {
    setCheckingOutId(booking._id);
    const { _id, __v, createdAt, updatedAt, billing, ...bookingFields } = booking;
    try {
      await updateCustomer(_id, { ...bookingFields, timeOut: formatLocalTime() });
      setActiveBookings((list) => list.filter((b) => b._id !== _id));
      setDueCheckouts((list) => list.filter((d) => d.customer._id !== _id));
      if (editingBooking?._id === _id) handleCancelEdit();
    } catch {
      setError("Could not check out that booking. Check your connection and try again.");
    } finally {
      setCheckingOutId(null);
    }
  };

  // Listen for discount changes dispatched by BillingSummary's input field.
  useEffect(() => {
    const handler = (e) => setOrder((o) => ({ ...o, discount: e.detail }));
    document.addEventListener("kpa:discount", handler);
    return () => document.removeEventListener("kpa:discount", handler);
  }, []);

  // Listen for promo code apply/remove, dispatched by BillingSummary once a
  // code has been validated against the current subtotal.
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail;
      if (detail) {
        setAppliedPromo({
          code: detail.code,
          type: detail.promo.type,
          value: detail.promo.value,
          discountAmount: detail.discountAmount,
        });
        setOrder((o) => ({ ...o, promoCode: detail.code, discount: detail.discountAmount }));
      } else {
        setAppliedPromo(null);
        setOrder((o) => ({ ...o, promoCode: "", discount: 0 }));
      }
    };
    document.addEventListener("kpa:promo", handler);
    return () => document.removeEventListener("kpa:promo", handler);
  }, []);

  // Date/Time In stay live until staff manually edits them, so the form
  // always reflects "right now" at the moment they hit Save.
  const dateTouched = useRef(false);
  const timeTouched = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => {
      setCustomer((c) => ({
        ...c,
        date: dateTouched.current ? c.date : formatLocalDate(),
        timeIn: timeTouched.current ? c.timeIn : formatLocalTime(),
      }));
    }, 15000);
    return () => clearInterval(tick);
  }, []);

  const totals = useMemo(() => computeTotals(order, settings), [order, settings]);
  const age = useMemo(() => calculateAge(customer.dob), [customer.dob]);

  // ── Incremental billing (Edit Booking flow) ───────────────────────────
  // `editingBooking` is a frozen snapshot of the booking as it was when the
  // edit started, so it doubles as the "what was already paid for" baseline
  // for as long as this edit is in progress.
  const previouslyPaid = editingBooking
    ? editingBooking.billing?.amountPaid ?? editingBooking.billing?.grandTotal ?? 0
    : 0;
  const newAdditions = useMemo(
    () => (editingBooking ? computeNewAdditions(order, settings, editingBooking) : { lineItems: [], cost: 0 }),
    [order, settings, editingBooking]
  );
  // Never let an edit that removed/reduced services show a negative amount
  // due — the customer simply owes nothing more right now.
  const amountDueNow = editingBooking ? Math.max(Math.round(totals.grandTotal - previouslyPaid), 0) : totals.grandTotal;
  // The figure the payment method/split controls should actually be collected
  // against: the full total for a new booking, or just the remaining balance
  // for an edit.
  const payableAmount = editingBooking ? amountDueNow : totals.grandTotal;

  // Called when staff click "Auto-fill Form" in the MobileSearch panel.
  const handleMobileFill = (profile) => {
    setCustomer((c) => ({
      ...c,
      parentName: profile.parentName || c.parentName,
      kidName: profile.kidName || c.kidName,
      mobileNumber: profile.mobileNumber || c.mobileNumber,
      dob: profile.dob
        ? (typeof profile.dob === "string" ? profile.dob.slice(0, 10) : new Date(profile.dob).toISOString().slice(0, 10))
        : c.dob,
    }));
  };

  const mobileError =
    customer.mobileNumber.length > 0 && customer.mobileNumber.length !== 10
      ? "Enter a valid 10-digit number"
      : "";

  const splitBalanced =
    customer.paymentMethod !== "split" ||
    // Nothing new to collect (e.g. editing just to fix a name, or the edit
    // only removed/reduced services) — whatever split figures were carried
    // over from the original booking are irrelevant, so don't block saving.
    payableAmount === 0 ||
    Math.round(Number(customer.splitPayment?.cashAmount) || 0) +
      Math.round(Number(customer.splitPayment?.gpayAmount) || 0) ===
      Math.round(payableAmount);

  const canSave =
    customer.parentName.trim() !== "" &&
    customer.kidName.trim() !== "" &&
    customer.mobileNumber.length === 10 &&
    splitBalanced;

  const handleSave = async () => {
    if (!canSave) {
      setError(
        !splitBalanced
          ? `Cash + GPay amounts must add up to the ${editingBooking ? "additional amount due" : "grand total"}.`
          : "Please fill in Kid Name and a valid 10-digit mobile number."
      );
      return;
    }
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      // Drop any sibling rows the staff added but left blank.
      const cleanedKids = (customer.additionalKids || []).filter(
        (k) => k.kidName && k.kidName.trim() !== ""
      );
      const payload = { ...customer, additionalKids: cleanedKids, ...order };

      const { data: savedBooking } = editingBooking
        ? await updateCustomer(editingBooking._id, payload)
        : await createCustomer(payload);

      setSaved(true);
      scheduleCheckoutReminder(savedBooking);

      // Keep the Active Bookings panel in sync immediately (don't wait for
      // the next poll) — update in place for an edit, or insert fresh.
      setActiveBookings((list) => {
        if (savedBooking.timeOut) return list.filter((b) => b._id !== savedBooking._id);
        const exists = list.some((b) => b._id === savedBooking._id);
        return exists
          ? list.map((b) => (b._id === savedBooking._id ? savedBooking : b))
          : [savedBooking, ...list];
      });

      setEditingBooking(null);
      dateTouched.current = false;
      timeTouched.current = false;
      setCustomer(emptyCustomer());
      setOrder(emptyOrder);
      setAppliedPromo(null);
      fetchWaitlistStatus(formatLocalDate()).then(({ data }) => setWaitlistStatus(data)).catch(() => {});
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          (editingBooking
            ? "Could not update the booking. Check that the backend server is running."
            : "Could not save the booking. Check that the backend server is running.")
      );
    } finally {
      setSaving(false);
    }
  };

  // Guard against ending up on a tab the current role isn't allowed to see
  // (e.g. role was changed by an admin in another tab, or stale state after
  // a refresh) by bouncing back to that role's home tab.
  useEffect(() => {
    const allowed = TAB_ROLES[activeTab] || [];
    if (!allowed.includes(role)) {
      setActiveTab(ROLE_HOME_TAB[role] || "booking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Settings holds business-sensitive config, so gate it behind an admin PIN.
  // Once unlocked for this session we don't nag again unless the page reloads.
  const handleTabSelect = (key) => {
    if (key === "settings" && !settingsUnlocked) {
      setShowPinModal(true);
      return;
    }
    setActiveTab(key);
  };

  const ALL_TABS = [
    { key: "booking", label: "Booking", icon: ClipboardList },
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "customers", label: "Customers", icon: Users },
    { key: "waitlist", label: "Waitlist", icon: Ticket },
    { key: "offers", label: "Offers", icon: Percent },
    { key: "birthdays", label: "Birthdays", icon: Cake },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];
  const tabs = ALL_TABS.filter(({ key }) => (TAB_ROLES[key] || []).includes(role));

  return (
    <div className="min-h-screen bg-cream jungle-bg relative">
      <DinoBackground variant="app" />
      <header className="relative z-10 bg-jungle-gradient py-3 px-6 shadow-pop">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="hidden md:block absolute z-0 pointer-events-none opacity-70"
            style={{ top: "8%" }}
            initial={{ x: "-10%" }}
            animate={{ x: "110vw", y: [0, 8, 0] }}
            transition={{ x: { duration: 26, repeat: Infinity, ease: "linear" }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
          >
            <Pterodactyl className="w-14 h-10" />
          </motion.div>
        </div>
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-cream">
          <div className="flex items-center gap-2">
            <motion.img
              src={settings.logo || "/dino-den-logo.png"}
              alt=""
              className="w-9 h-9 rounded-full object-cover shadow-popsm border-2 border-cream/30"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="font-display text-xl md:text-2xl tracking-wide drop-shadow">
              {settings.businessName}
            </span>
          </div>

          <nav className="flex items-center gap-2 bg-black/15 rounded-2xl p-1.5 w-fit">
            {tabs.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabSelect(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-display text-base md:text-lg tracking-wide transition-colors ${
                    active ? "bg-cream text-fern shadow-pop" : "text-cream/80 hover:text-cream"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <NotificationBell
              dueCheckouts={dueCheckouts}
              onCheckout={handleCheckout}
              onDismissDue={handleDismissDue}
              todaysBirthdays={todaysBirthdays}
              waitlistStatus={waitlistStatus}
              liveOffers={liveOffers}
              onGoToWaitlist={() => setActiveTab("waitlist")}
            />
            <UserMenu user={user} onLogout={logout} />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-screen-2xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="flex flex-col gap-8"
      >
        {activeTab === "dashboard" ? (
          <Dashboard />
        ) : activeTab === "customers" ? (
          <CustomerDirectory />
        ) : activeTab === "waitlist" ? (
          <WaitlistPanel />
        ) : activeTab === "offers" ? (
          <OffersManager />
        ) : activeTab === "birthdays" ? (
          <Birthdays />
        ) : activeTab === "settings" ? (
          <SettingsPage />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8 items-start">
            <ActiveBookingsPanel
              bookings={activeBookings}
              loading={activeLoading}
              editingId={editingBooking?._id || null}
              checkingOutId={checkingOutId}
              onEdit={handleEditBooking}
              onCheckout={handleCheckoutFromPanel}
            />

            <div className="flex flex-col gap-8 min-w-0">
              {waitlistStatus?.isFull && (
                <motion.button
                  type="button"
                  onClick={() => setActiveTab("waitlist")}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full text-left bg-lava/10 border-2 border-lava/30 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-lava/15 transition-colors"
                >
                  <span className="font-display text-sm text-lava flex items-center gap-2">
                    🔴 Play area is at capacity ({waitlistStatus.currentOccupancy}/{waitlistStatus.capacity})
                    {waitlistStatus.waitingCount > 0 ? ` — ${waitlistStatus.waitingCount} already waiting` : ""}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-lava shrink-0">
                    Open Waitlist →
                  </span>
                </motion.button>
              )}

              <AnimatePresence>
                {editingBooking && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber/10 border-2 border-amber/30 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-display text-sm text-amber flex items-center gap-2">
                        ✏️ Editing {editingBooking.kidName}'s booking — updates will merge into the existing record, not create a new one.
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-xs font-extrabold uppercase tracking-wide text-ink/50 hover:text-lava transition-colors shrink-0"
                      >
                        Cancel Edit
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <MobileSearch onFill={handleMobileFill} />

              <CustomerForm
                customer={customer}
                setCustomer={setCustomer}
                order={order}
                setOrder={setOrder}
                age={age}
                mobileError={mobileError}
                onDateTouched={() => (dateTouched.current = true)}
                onTimeTouched={() => (timeTouched.current = true)}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 items-start">
                <div className="flex flex-col gap-6 lg:gap-7">
                  <PlayPackages order={order} setOrder={setOrder} />
                  <Gaming order={order} setOrder={setOrder} />
                  <Socks order={order} setOrder={setOrder} />
                </div>

                <div className="flex flex-col gap-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-lava/10 border-2 border-lava/40 text-lava font-bold rounded-2xl px-4 py-3 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                  <PaymentMethod
                    value={customer.paymentMethod}
                    onChange={(method) => setCustomer((c) => ({ ...c, paymentMethod: method }))}
                    splitAmounts={customer.splitPayment}
                    onSplitChange={(splitPayment) => setCustomer((c) => ({ ...c, splitPayment }))}
                    grandTotal={payableAmount}
                    totalLabel={editingBooking ? "Amount Due Now" : undefined}
                    date={customer.date}
                  />
                  <BillingSummary
                    totals={totals}
                    paymentMethod={customer.paymentMethod}
                    splitPayment={customer.splitPayment}
                    onSave={handleSave}
                    saving={saving}
                    saved={saved}
                    disabled={!canSave}
                    appliedPromo={appliedPromo}
                    editing={!!editingBooking}
                    onCancelEdit={handleCancelEdit}
                    previouslyPaid={previouslyPaid}
                    newAdditions={newAdditions}
                    amountDueNow={amountDueNow}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      </AnimatePresence>
      </main>

      <BirthdayPopup kids={todaysBirthdays} onClose={() => setTodaysBirthdays([])} />
      <TimeoutAlert items={dueCheckouts} onCheckout={handleCheckout} onDismiss={handleDismissDue} />
      <AdminPinModal
        open={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {
          setSettingsUnlocked(true);
          setShowPinModal(false);
          setActiveTab("settings");
        }}
      />
    </div>
  );
}
