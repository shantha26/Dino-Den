import { Router } from "express";
import PromoCode from "../models/PromoCode.js";
import { validatePromo, isPromoLive, todayStr } from "../utils/promoValidation.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/promo-codes?active=true&festival=true&live=true&date=YYYY-MM-DD
// `live=true` additionally filters out codes that are inactive, outside
// their date window, or already used up — i.e. "could a customer actually
// use this right now". Used to surface offers in the notification bell
// and to whoever just joined the waitlist.
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === "true" || req.query.live === "true") filter.active = true;
    if (req.query.festival === "true") filter.isFestival = true;
    let promoCodes = await PromoCode.find(filter).sort({ createdAt: -1 });

    if (req.query.live === "true") {
      const date = req.query.date || todayStr();
      promoCodes = promoCodes.filter((p) => isPromoLive(p, date));
    }

    res.json(promoCodes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch promo codes", details: err.message });
  }
});

// POST /api/promo-codes/validate — { code, subtotal } → checks a code without applying it.
// Placed before "/:id" routes so "validate" is never mistaken for an id.
router.post("/validate", async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ valid: false, reason: "Enter a promo code" });
    }
    const promo = await PromoCode.findOne({ code: code.trim().toUpperCase() });
    const result = validatePromo(promo, Number(subtotal) || 0);
    if (!result.valid) return res.json({ valid: false, reason: result.reason });

    res.json({
      valid: true,
      discountAmount: result.discountAmount,
      promo: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        description: promo.description,
        isFestival: promo.isFestival,
        festivalName: promo.festivalName,
      },
    });
  } catch (err) {
    res.status(500).json({ valid: false, reason: "Could not validate promo code" });
  }
});

// POST /api/promo-codes — create a new promo/festival code
router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.code) body.code = body.code.trim().toUpperCase();
    const promo = new PromoCode(body);
    await promo.save();
    res.status(201).json(promo);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "A promo code with that code already exists" });
    }
    res.status(400).json({ error: "Failed to create promo code", details: err.message });
  }
});

// PUT /api/promo-codes/:id
router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.code) body.code = body.code.trim().toUpperCase();
    const promo = await PromoCode.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!promo) return res.status(404).json({ error: "Promo code not found" });
    res.json(promo);
  } catch (err) {
    res.status(400).json({ error: "Failed to update promo code", details: err.message });
  }
});

// DELETE /api/promo-codes/:id
router.delete("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ error: "Promo code not found" });
    res.json({ message: "Promo code deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete promo code", details: err.message });
  }
});

export default router;
