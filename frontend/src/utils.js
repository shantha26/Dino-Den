// Local-time helpers. Using toISOString() for "today" is a common bug — it
// reports the UTC date, which flips to the wrong day in the evening for
// timezones ahead of UTC (like India). These use the browser's local clock.

export function formatLocalDate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatLocalTime(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Display-only: turns "yyyy-mm-dd" (the format stored/sent to the backend)
// into "dd-mm-yyyy" for read-only display fields. Does not affect the
// underlying stored value.
export function formatDMY(isoDateStr) {
  if (!isoDateStr) return "";
  const [yyyy, mm, dd] = isoDateStr.split("-");
  if (!yyyy || !mm || !dd) return isoDateStr;
  return `${dd}-${mm}-${yyyy}`;
}

// Turns a date-of-birth string (YYYY-MM-DD) into a friendly age like
// "3 yrs 4 mo" or "7 mo" for babies under a year.
export function calculateAge(dobStr) {
  if (!dobStr) return "";
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  if (today.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "";
  if (years < 1) return `${months} mo`;
  return months > 0 ? `${years} yr ${months} mo` : `${years} yr${years > 1 ? "s" : ""}`;
}

// Turns any dob-ish value (ISO string, Date object, or already-short
// "YYYY-MM-DD") into the plain "YYYY-MM-DD" string the <input type="date">
// fields expect — used when loading a saved booking back into the form.
export function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// Packages that have a fixed play duration — once this many minutes pass
// after check-in, staff get an automatic checkout reminder. Shared between
// the reminder scheduler and the Active Bookings panel's "Due" flag.
export const TIMED_PACKAGES = {
  half_hour_soft_play: { minutes: 30, label: "Half Hour Soft Play" },
};

// Whole minutes elapsed between a booking's date+timeIn and `now`. Returns
// null if either piece is missing/unparseable.
export function minutesSince(dateStr, timeStr, now = new Date()) {
  if (!dateStr || !timeStr) return null;
  const start = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, Math.floor((now - start) / 60000));
}

// "42m" under an hour, "1h 20m" beyond that.
export function formatElapsed(minutes) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// True once a booking's timed package (e.g. Half Hour Soft Play) has run
// past its allotted minutes and nobody's checked the kid out yet.
export function isBookingDue(booking, now = new Date()) {
  if (!booking || booking.timeOut) return false;
  const timedKey = Object.keys(TIMED_PACKAGES).find((key) => (booking.playPackages?.[key] || 0) > 0);
  if (!timedKey) return false;
  const elapsed = minutesSince(booking.date, booking.timeIn, now);
  return elapsed != null && elapsed >= TIMED_PACKAGES[timedKey].minutes;
}


// kid-package dropdowns in CustomerForm. Kept separate from live settings
// pricing so historical bookings still show a sensible label even if an
// admin later renames/removes a package.
export const PACKAGE_KEY_LABELS = {
  "play:half_hour_soft_play": "Half Hour Soft Play",
  "play:unlimited_soft_play": "Unlimited Soft Play",
  "play:unlimited_soft_play_arcade": "Unlimited Soft Play + Arcade",
  "arcade:coins": "Arcade Coin",
  "arcade:basketball": "Basketball",
  "gaming:ps3": "PS3 (1hr)",
  "gaming:ps5": "PS5 (1hr)",
  "socks:kid": "Kid Socks",
  "socks:adult": "Adult Socks",
};

function packageValueLabel(value) {
  return PACKAGE_KEY_LABELS[value] || value;
}

// Every "<category>:<key>" value mapped to how many units of it this
// booking has in total, straight from the booking-level fields.
function packageTotals(c) {
  return {
    "play:half_hour_soft_play": c.playPackages?.half_hour_soft_play || 0,
    "play:unlimited_soft_play": c.playPackages?.unlimited_soft_play || 0,
    "play:unlimited_soft_play_arcade": c.playPackages?.unlimited_soft_play_arcade || 0,
    "arcade:coins": c.arcadeCoins || 0,
    "arcade:basketball": c.basketballQty || 0,
    "gaming:ps3": c.gaming?.ps3Hours || 0,
    "gaming:ps5": c.gaming?.ps5Hours || 0,
    "socks:kid": c.socks?.kidQty || 0,
    "socks:adult": c.socks?.adultQty || 0,
  };
}

// Returns one entry per kid on a booking — the primary kid first, then any
// siblings — each with the specific package(s) actually booked for them:
//   [{ name: "Aarav", packages: ["Half Hour Soft Play"] },
//    { name: "Diya",  packages: ["Unlimited Soft Play"] }]
//
// Siblings each carry an explicit package (chosen in their own dropdown),
// so that's a direct 1:1 lookup. The primary kid has no such dropdown —
// their packages are whatever's left on the booking after subtracting
// everything explicitly claimed by siblings, which also naturally captures
// any general extras (e.g. arcade coins bought without picking a specific
// kid) since those are billed under the primary kid regardless.
export function getKidPackageBreakdown(customer) {
  const additionalKids = (customer.additionalKids || []).filter((k) => k?.kidName);
  const remaining = packageTotals(customer);

  const siblingEntries = additionalKids.map((kid) => {
    const label = kid.packageLabel || (kid.package ? packageValueLabel(kid.package) : "");
    if (kid.package && remaining[kid.package] > 0) remaining[kid.package] -= 1;
    return { name: kid.kidName, packages: label ? [label] : [] };
  });

  const primaryPackages = Object.entries(remaining)
    .filter(([, qty]) => qty > 0)
    .map(([value, qty]) => {
      const label = packageValueLabel(value);
      return qty > 1 ? `${label} ×${qty}` : label;
    });

  const entries = [];
  if (customer.kidName) entries.push({ name: customer.kidName, packages: primaryPackages });
  entries.push(...siblingEntries);
  return entries;
}
