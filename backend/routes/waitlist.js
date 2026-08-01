import { Router } from "express";
import Customer from "../models/Customer.js";
import WaitlistEntry from "../models/WaitlistEntry.js";
import PromoCode from "../models/PromoCode.js";
import { getMaxCapacity, getAvgSessionMinutes } from "../config/capacity.js";
import { isPromoLive } from "../utils/promoValidation.js";

const router = Router();

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Roughly one slot frees up every (average session length / capacity)
// minutes, assuming a steady one-in-one-out turnover. A family at queue
// position N should expect to wait about that long, times N. Floored at
// 5 minutes so the estimate never reads as "0 min" right after joining.
function estimateWaitMinutes(position) {
  const turnoverPerSlot = getAvgSessionMinutes() / getMaxCapacity();
  return Math.max(5, Math.round(position * turnoverPerSlot));
}

async function getLiveOffers(date) {
  const promos = await PromoCode.find({ active: true }).lean();
  return promos
    .filter((p) => isPromoLive(p, date))
    .map((p) => ({
      code: p.code,
      type: p.type,
      value: p.value,
      description: p.description,
      isFestival: p.isFestival,
      festivalName: p.festivalName,
    }));
}

// GET /api/waitlist/status?date=YYYY-MM-DD — is the play area full right now?
// Placed before "/:id" routes so "status" is never mistaken for an id.
router.get("/status", async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    // "Checked in" = a visit today that hasn't been checked out yet.
    const currentOccupancy = await Customer.countDocuments({
      date,
      $or: [{ timeOut: { $exists: false } }, { timeOut: "" }, { timeOut: null }],
    });
    const waitingCount = await WaitlistEntry.countDocuments({ date, status: "waiting" });

    const capacity = getMaxCapacity();
    res.json({
      date,
      capacity,
      currentOccupancy,
      isFull: currentOccupancy >= capacity,
      waitingCount,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch capacity status", details: err.message });
  }
});

// GET /api/waitlist?date=YYYY-MM-DD — the day's queue, with live position + ETA
router.get("/", async (req, res) => {
  try {
    const date = req.query.date || todayStr();
    const entries = await WaitlistEntry.find({ date }).sort({ tokenNumber: 1 }).lean();

    let position = 0;
    const withEta = entries.map((e) => {
      if (e.status !== "waiting") return { ...e, position: null, estimatedWaitMinutes: 0 };
      position += 1;
      return { ...e, position, estimatedWaitMinutes: estimateWaitMinutes(position) };
    });

    res.json({ date, entries: withEta });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch waitlist", details: err.message });
  }
});

// POST /api/waitlist — join the queue; auto-assigns the next token number for the day
router.post("/", async (req, res) => {
  try {
    const { parentName, kidName, mobileNumber } = req.body;
    if (!parentName || !kidName || !mobileNumber) {
      return res.status(400).json({ error: "Parent name, kid name, and mobile number are required" });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({ error: "Provide a valid 10-digit mobile number" });
    }

    const date = req.body.date || todayStr();
    const last = await WaitlistEntry.findOne({ date }).sort({ tokenNumber: -1 }).lean();
    const tokenNumber = (last?.tokenNumber || 0) + 1;

    const entry = await WaitlistEntry.create({
      parentName,
      kidName,
      mobileNumber,
      date,
      tokenNumber,
      status: "waiting",
    });

    const waitingAhead = await WaitlistEntry.countDocuments({
      date,
      status: "waiting",
      tokenNumber: { $lt: tokenNumber },
    });
    const position = waitingAhead + 1;
    const estimatedWaitMinutes = estimateWaitMinutes(position);
    const offers = await getLiveOffers(date);

    res.status(201).json({
      entry: { ...entry.toObject(), position, estimatedWaitMinutes },
      offers,
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to join waitlist", details: err.message });
  }
});

// PUT /api/waitlist/:id — staff update status (notify, seat, or cancel an entry)
router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["waiting", "notified", "seated", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const update = { status };
    if (status === "notified") update.notifiedAt = new Date();
    if (status === "seated") update.seatedAt = new Date();

    const entry = await WaitlistEntry.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!entry) return res.status(404).json({ error: "Waitlist entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: "Failed to update waitlist entry", details: err.message });
  }
});

// DELETE /api/waitlist/:id — remove an entry entirely
router.delete("/:id", async (req, res) => {
  try {
    const entry = await WaitlistEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: "Waitlist entry not found" });
    res.json({ message: "Removed from waitlist" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove waitlist entry", details: err.message });
  }
});

export default router;
