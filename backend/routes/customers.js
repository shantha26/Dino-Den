import { Router } from "express";
import Customer from "../models/Customer.js";
import PromoCode from "../models/PromoCode.js";
import { computeTotals, getPlayPackages, getGaming, getSocks, getArcade, getBasketball, getGstPercentage } from "../config/pricing.js";
import { buildCustomerProfile, computeLoyaltyPoints, computeMembershipTier, daysUntilBirthday } from "../utils/customerInsights.js";
import { validatePromo } from "../utils/promoValidation.js";
import { notifyBookingConfirmation, notifyPaymentReceipt, notifyMembershipReminder } from "../utils/notifications.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

// Helpers for grouping the string "YYYY-MM-DD" dates that are stored on each visit.
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isoWeekLabel(dateObj) {
  // Monday-start week, labelled by the week's Monday date.
  const d = new Date(dateObj);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function monthLabel(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

// GET /api/customers/stats/overview — aggregated numbers for the dashboard tab.
// Placed before the /:id route so "stats" is never mistaken for a Mongo id.
router.get("/stats/overview", async (req, res) => {
  try {
    const customers = await Customer.find(
      {},
      "date paymentMethod billing playPackages arcadeCoins basketballQty gaming socks"
    ).lean();

    const dailyMap = new Map();
    const weeklyMap = new Map();
    const monthlyMap = new Map();
    const paymentMap = new Map([
      ["cash", { method: "cash", count: 0, revenue: 0 }],
      ["gpay", { method: "gpay", count: 0, revenue: 0 }],
      ["split", { method: "split", count: 0, revenue: 0 }],
    ]);

    const PLAY_PACKAGES = getPlayPackages();
    const GAMING = getGaming();
    const SOCKS = getSocks();
    const ARCADE = getArcade();
    const BASKETBALL = getBasketball();

    const packageTotals = {};
    for (const key of Object.keys(PLAY_PACKAGES)) {
      packageTotals[key] = { name: PLAY_PACKAGES[key].label, category: "Play Packages", qty: 0, revenue: 0 };
    }
    packageTotals.arcadeCoins = { name: "Arcade Coins", category: "Arcade", qty: 0, revenue: 0 };
    packageTotals.basketball = { name: "Basketball", category: "Arcade", qty: 0, revenue: 0 };
    packageTotals.ps3 = { name: GAMING.ps3.label, category: "Gaming", qty: 0, revenue: 0 };
    packageTotals.ps5 = { name: GAMING.ps5.label, category: "Gaming", qty: 0, revenue: 0 };
    packageTotals.kidSocks = { name: SOCKS.kid.label, category: "Socks", qty: 0, revenue: 0 };
    packageTotals.adultSocks = { name: SOCKS.adult.label, category: "Socks", qty: 0, revenue: 0 };

    for (const c of customers) {
      const revenue = c.billing?.grandTotal || 0;
      const dateObj = parseLocalDate(c.date);

      // Daily
      if (!dailyMap.has(c.date)) dailyMap.set(c.date, { date: c.date, revenue: 0, customers: 0 });
      const dEntry = dailyMap.get(c.date);
      dEntry.revenue += revenue;
      dEntry.customers += 1;

      // Weekly (Monday-start)
      const wLabel = isoWeekLabel(dateObj);
      if (!weeklyMap.has(wLabel)) weeklyMap.set(wLabel, { week: wLabel, revenue: 0, customers: 0 });
      const wEntry = weeklyMap.get(wLabel);
      wEntry.revenue += revenue;
      wEntry.customers += 1;

      // Monthly
      const mLabel = monthLabel(c.date);
      if (!monthlyMap.has(mLabel)) monthlyMap.set(mLabel, { month: mLabel, revenue: 0, customers: 0 });
      const mEntry = monthlyMap.get(mLabel);
      mEntry.revenue += revenue;
      mEntry.customers += 1;

      // Payment method
      const method = paymentMap.has(c.paymentMethod) ? c.paymentMethod : "cash";
      const pEntry = paymentMap.get(method);
      pEntry.count += 1;
      pEntry.revenue += revenue;

      // Package breakdown
      const pp = c.playPackages || {};
      for (const key of Object.keys(PLAY_PACKAGES)) {
        const qty = Number(pp[key]) || 0;
        packageTotals[key].qty += qty;
        packageTotals[key].revenue += qty * PLAY_PACKAGES[key].price;
      }
      const arcadeCoins = Number(c.arcadeCoins) || 0;
      packageTotals.arcadeCoins.qty += arcadeCoins;
      packageTotals.arcadeCoins.revenue += arcadeCoins * ARCADE.price;

      const basketballQty = Number(c.basketballQty) || 0;
      packageTotals.basketball.qty += basketballQty;
      packageTotals.basketball.revenue += basketballQty * BASKETBALL.price;

      const gaming = c.gaming || {};
      const ps3Hours = Number(gaming.ps3Hours) || 0;
      const ps5Hours = Number(gaming.ps5Hours) || 0;
      packageTotals.ps3.qty += ps3Hours;
      packageTotals.ps3.revenue += ps3Hours * GAMING.ps3.pricePerHour;
      packageTotals.ps5.qty += ps5Hours;
      packageTotals.ps5.revenue += ps5Hours * GAMING.ps5.pricePerHour;

      const socks = c.socks || {};
      const kidQty = Number(socks.kidQty) || 0;
      const adultQty = Number(socks.adultQty) || 0;
      packageTotals.kidSocks.qty += kidQty;
      packageTotals.kidSocks.revenue += kidQty * SOCKS.kid.price;
      packageTotals.adultSocks.qty += adultQty;
      packageTotals.adultSocks.revenue += adultQty * SOCKS.adult.price;
    }

    const sortByKey = (map, key) => [...map.values()].sort((a, b) => (a[key] > b[key] ? 1 : -1));

    res.json({
      daily: sortByKey(dailyMap, "date").slice(-14),
      weekly: sortByKey(weeklyMap, "week").slice(-8),
      monthly: sortByKey(monthlyMap, "month").slice(-12),
      packages: Object.values(packageTotals)
        .filter((p) => p.qty > 0 || p.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue),
      payments: [...paymentMap.values()],
      totals: {
        customers: customers.length,
        revenue: customers.reduce((sum, c) => sum + (c.billing?.grandTotal || 0), 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute stats", details: err.message });
  }
});

// GET /api/customers/birthdays — every registered kid's birthday, grouped by
// month, deduplicated per kid, with the current month singled out and
// today's birthdays flagged for the pop-up alert.
router.get("/birthdays", async (req, res) => {
  try {
    const customers = await Customer.find(
      { dob: { $exists: true, $ne: null } },
      "kidName parentName mobileNumber dob"
    ).lean();

    const now = new Date();
    const currentMonthIdx = now.getMonth(); // 0-indexed
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // A kid can have multiple visit documents (repeat visits); keep one entry per kid.
    const uniqueKids = new Map();
    for (const c of customers) {
      if (!c.dob) continue;
      const key = `${c.mobileNumber}-${c.kidName.trim().toLowerCase()}`;
      uniqueKids.set(key, c);
    }

    // One bucket per calendar month (0 = January ... 11 = December).
    const byMonthIdx = Array.from({ length: 12 }, () => []);
    for (const c of uniqueKids.values()) {
      const dob = new Date(c.dob);
      if (Number.isNaN(dob.getTime())) continue;
      const monthIdx = dob.getMonth();
      byMonthIdx[monthIdx].push({
        kidName: c.kidName,
        parentName: c.parentName,
        mobileNumber: c.mobileNumber,
        dob: c.dob,
        day: dob.getDate(),
        turningAge: currentYear - dob.getFullYear(),
        isToday: monthIdx === currentMonthIdx && dob.getDate() === currentDay,
      });
    }
    byMonthIdx.forEach((list) => list.sort((a, b) => a.day - b.day));

    const byMonth = MONTH_NAMES.map((name, idx) => ({
      month: name,
      monthIdx: idx,
      isCurrent: idx === currentMonthIdx,
      kids: byMonthIdx[idx],
    }));

    const thisMonth = byMonthIdx[currentMonthIdx];

    res.json({
      month: MONTH_NAMES[currentMonthIdx],
      monthIdx: currentMonthIdx,
      year: currentYear,
      today: currentDay,
      thisMonth,
      todaysBirthdays: thisMonth.filter((k) => k.isToday),
      byMonth,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch birthdays", details: err.message });
  }
});

// GET /api/customers/search?mobile=XXXXXXXXXX — look up a customer's profile and
// full visit history by mobile number, used by the Search by Mobile feature.
// Must be placed before the generic GET "/" so it doesn't get shadowed.
router.get("/search", async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: "Provide a valid 10-digit mobile number" });
    }

    // Fetch all visits for this mobile, newest first.
    const visits = await Customer.find({ mobileNumber: mobile })
      .sort({ createdAt: -1 })
      .lean();

    if (visits.length === 0) {
      return res.json({ found: false, profile: null, visits: [], stats: null });
    }

    const built = buildCustomerProfile(mobile, visits);
    const profile = {
      parentName: built.parentName,
      kidName: built.kidName,
      kidNames: built.kidNames,
      mobileNumber: built.mobileNumber,
      dob: built.dob,
    };

    res.json({
      found: true,
      profile,
      visits,
      stats: {
        totalVisits: built.totalVisits,
        totalSpent: built.totalSpent,
        firstVisit: built.firstVisit,
        lastVisit: built.lastVisit,
        membership: built.membership,
        loyaltyPoints: built.loyaltyPoints,
        birthdayInDays: built.birthdayInDays,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Search failed", details: err.message });
  }
});

// GET /api/customers/directory?q=&sort= — searchable directory of every
// customer (family), one card per mobile number, with visit/loyalty/
// membership/birthday stats aggregated from their existing visit
// documents. Visit history itself is fetched on demand via /search so
// this list stays light. Must be placed before the generic GET "/".
router.get("/directory", async (req, res) => {
  try {
    const { q, sort } = req.query;

    const visits = await Customer.find(
      {},
      "parentName kidName additionalKids mobileNumber dob date billing createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    const byMobile = new Map();
    for (const v of visits) {
      if (!byMobile.has(v.mobileNumber)) byMobile.set(v.mobileNumber, []);
      byMobile.get(v.mobileNumber).push(v);
    }

    let customers = [...byMobile.entries()].map(([mobileNumber, group]) =>
      buildCustomerProfile(mobileNumber, group)
    );

    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      customers = customers.filter(
        (c) =>
          c.parentName?.toLowerCase().includes(needle) ||
          c.kidNames.some((k) => k.toLowerCase().includes(needle)) ||
          c.mobileNumber.includes(needle)
      );
    }

    const sorters = {
      recent: (a, b) => (a.lastVisit < b.lastVisit ? 1 : -1),
      visits: (a, b) => b.totalVisits - a.totalVisits,
      spent: (a, b) => b.totalSpent - a.totalSpent,
      points: (a, b) => b.loyaltyPoints - a.loyaltyPoints,
      name: (a, b) => (a.parentName || "").localeCompare(b.parentName || ""),
      birthday: (a, b) => {
        if (a.birthdayInDays == null) return 1;
        if (b.birthdayInDays == null) return -1;
        return a.birthdayInDays - b.birthdayInDays;
      },
    };
    customers.sort(sorters[sort] || sorters.recent);

    res.json({ count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer directory", details: err.message });
  }
});

// GET /api/customers?date=YYYY-MM-DD  — list visits, newest first, optional date filter
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    // When no date filter is given (e.g. dashboard CSV export), return all records.
    // With a date filter (booking tab live view) cap at 200 to keep it snappy.
    const limit = req.query.date ? 200 : 5000;
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers", details: err.message });
  }
});

// GET /api/customers/:id
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer", details: err.message });
  }
});

// POST /api/customers — create a new visit/registration
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    // Recompute billing on the server so the stored total can always be trusted,
    // even if the client sent a stale or tampered figure.
    const base = computeTotals(body);

    let discountAmount = 0;
    let promoCode = null;

    if (body.promoCode) {
      const code = String(body.promoCode).trim().toUpperCase();
      const promo = await PromoCode.findOne({ code });
      const validation = validatePromo(promo, base.subtotal);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.reason || "Invalid promo code" });
      }
      discountAmount = validation.discountAmount;
      promoCode = promo.code;
      promo.usedCount += 1;
      await promo.save();
    } else if (body.discount) {
      discountAmount = Math.min(Math.max(Number(body.discount) || 0, 0), base.subtotal);
    }

    const afterDiscount = base.subtotal - discountAmount;
    const gstAmount = Math.round(afterDiscount * (getGstPercentage() / 100));

    const billing = {
      playPackageCost: base.playPackageCost,
      arcadeCost: base.arcadeCost,
      gamingCost: base.gamingCost,
      socksCost: base.socksCost,
      subtotal: base.subtotal,
      discountAmount,
      promoCode,
      gstAmount,
      grandTotal: afterDiscount + gstAmount,
    };
    // A fresh booking is paid in full up front — this is the baseline that
    // any later edit's incremental billing gets compared against.
    billing.amountPaid = billing.grandTotal;
    billing.lastPaymentAmount = billing.grandTotal;

    // Split payments must add up to the exact total — checked server-side too,
    // since the stored total is recomputed here and could differ from what
    // the client last saw (e.g. a promo code or discount changed it).
    if (body.paymentMethod === "split") {
      const cashAmount = Number(body.splitPayment?.cashAmount) || 0;
      const gpayAmount = Number(body.splitPayment?.gpayAmount) || 0;
      if (Math.round(cashAmount + gpayAmount) !== Math.round(billing.grandTotal)) {
        return res.status(400).json({
          error: "Split payment amounts must add up to the grand total.",
        });
      }
    }

    const customer = new Customer({ ...body, billing });
    await customer.save();

    // Fire notifications asynchronously (don't block the HTTP response)
    setImmediate(async () => {
      try {
        const customerEmail = body.email || null;
        // Booking confirmation
        await notifyBookingConfirmation({ ...customer.toObject(), billing }, customerEmail);
        // Payment receipt
        await notifyPaymentReceipt({ ...customer.toObject(), billing }, customerEmail);
        // Check if membership tier changed — fetch all visits to compute
        const allVisits = await Customer.find({ mobileNumber: customer.mobileNumber }).lean();
        if (allVisits.length > 0) {
          const profile = buildCustomerProfile(customer.mobileNumber, allVisits);
          // Only send membership reminder on milestone visits (2, 5, 10, 20)
          const milestones = [2, 5, 10, 20];
          if (milestones.includes(profile.totalVisits)) {
            await notifyMembershipReminder(
              { ...customer.toObject(), totalVisits: profile.totalVisits, loyaltyPoints: profile.loyaltyPoints, membership: profile.membership },
              customerEmail
            );
          }
        }
      } catch (notifErr) {
        console.error("[Notification error on create]", notifErr.message);
      }
    });

    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: "Failed to save customer", details: err.message });
  }
});

// PUT /api/customers/:id — update a visit (e.g. set Time Out, adjust services)
router.put("/:id", async (req, res) => {
  try {
    const existing = await Customer.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Customer not found" });

    const body = req.body;
    const base = computeTotals(body);

    // Default to whatever was already applied — a plain checkout-time
    // update (e.g. just setting Time Out) won't include discount/promoCode
    // fields at all, and that must NOT silently erase an already-applied
    // discount. Only an explicit field in the request body changes it.
    let discountAmount = existing.billing?.discountAmount || 0;
    let promoCode = existing.billing?.promoCode || null;
    const hasPromoField = Object.prototype.hasOwnProperty.call(body, "promoCode");
    const hasDiscountField = Object.prototype.hasOwnProperty.call(body, "discount");

    if (hasPromoField && body.promoCode) {
      const requestedCode = String(body.promoCode).trim().toUpperCase();
      const promo = await PromoCode.findOne({ code: requestedCode });
      const validation = validatePromo(promo, base.subtotal);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.reason || "Invalid promo code" });
      }
      discountAmount = validation.discountAmount;
      promoCode = promo.code;
      // Only count as a fresh use if it wasn't already applied to this
      // same booking — otherwise every minor edit burns another use of a
      // limited-use code.
      if (existing.billing?.promoCode !== promoCode) {
        promo.usedCount += 1;
        await promo.save();
      }
    } else if (hasPromoField && !body.promoCode) {
      // Explicit clear of the promo code.
      promoCode = null;
      discountAmount = hasDiscountField
        ? Math.min(Math.max(Number(body.discount) || 0, 0), base.subtotal)
        : 0;
    } else if (hasDiscountField) {
      discountAmount = Math.min(Math.max(Number(body.discount) || 0, 0), base.subtotal);
      promoCode = null;
    } else {
      // Neither field sent — keep the existing discount, just re-capped
      // in case services were edited and the subtotal shrank.
      discountAmount = Math.min(discountAmount, base.subtotal);
    }

    const afterDiscount = base.subtotal - discountAmount;
    const gstAmount = Math.round(afterDiscount * (getGstPercentage() / 100));

    const billing = {
      playPackageCost: base.playPackageCost,
      arcadeCost: base.arcadeCost,
      gamingCost: base.gamingCost,
      socksCost: base.socksCost,
      subtotal: base.subtotal,
      discountAmount,
      promoCode,
      gstAmount,
      grandTotal: afterDiscount + gstAmount,
    };

    // ── Incremental billing ─────────────────────────────────────────────
    // Never re-charge for services already paid for. `amountPaid` on the
    // existing record is the running total actually collected so far
    // (falls back to the old grandTotal for records saved before this field
    // existed). Whatever this edit's recomputed grand total exceeds that by
    // is the only amount still owed — if the edit removed/reduced services
    // instead of adding paid ones, that's 0, never negative.
    const previouslyPaid = existing.billing?.amountPaid ?? existing.billing?.grandTotal ?? 0;
    const amountDueNow = Math.max(Math.round(billing.grandTotal) - Math.round(previouslyPaid), 0);
    billing.amountPaid = amountDueNow > 0 ? previouslyPaid + amountDueNow : previouslyPaid;
    billing.lastPaymentAmount = amountDueNow;

    // Split payments only need to cover the additional amount due now, not
    // the whole (already partly paid) total — but only enforce this when
    // there's actually something new to collect. A no-op update (e.g. just
    // setting Time Out) sends the booking's original, already-balanced
    // splitPayment through unchanged and shouldn't be rejected for it.
    if (body.paymentMethod === "split" && amountDueNow > 0) {
      const cashAmount = Number(body.splitPayment?.cashAmount) || 0;
      const gpayAmount = Number(body.splitPayment?.gpayAmount) || 0;
      if (Math.round(cashAmount + gpayAmount) !== Math.round(amountDueNow)) {
        return res.status(400).json({
          error: "Cash + GPay amounts must add up to the additional amount due, not the full total.",
        });
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...body, billing },
      { new: true, runValidators: true }
    );
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: "Failed to update customer", details: err.message });
  }
});

// DELETE /api/customers/:id — admin/manager only; cashiers can create and
// check out bookings but shouldn't be able to erase records.
router.delete("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json({ message: "Customer deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete customer", details: err.message });
  }
});

export default router;
