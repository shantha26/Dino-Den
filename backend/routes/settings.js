import { Router } from "express";
import Settings from "../models/Settings.js";
import { getSettings, updateSettings, loadSettings } from "../config/settingsCache.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();

// Fields the Settings page is allowed to write. Kept as an allow-list so a
// stray extra key in the request body (e.g. _id, key, timestamps) can never
// overwrite something it shouldn't.
const EDITABLE_FIELDS = [
  "businessName",
  "logo",
  "gstPercentage",
  "maxCapacity",
  "avgSessionMinutes",
  "softPlayPricing",
  "arcadePricing",
  "basketballPricing",
  "gamingPricing",
  "socksPricing",
  "membershipPlans",
  "notifications",
];

// GET /api/settings — current settings (served straight from the in-memory
// cache, which is always in sync with MongoDB).
router.get("/", (req, res) => {
  res.json(getSettings());
});

// PUT /api/settings — partial update; only recognized fields are applied.
// Admin-only: Settings holds pricing, capacity, and notification credentials.
router.put("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const patch = {};
    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        patch[field] = body[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(patch, "softPlayPricing")) {
      if (!Array.isArray(patch.softPlayPricing) || patch.softPlayPricing.some((p) => !p.key || !p.label)) {
        return res.status(400).json({ error: "softPlayPricing must be a list of { key, label, price }" });
      }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "membershipPlans")) {
      if (!Array.isArray(patch.membershipPlans) || patch.membershipPlans.some((p) => !p.name)) {
        return res.status(400).json({ error: "membershipPlans must be a list of { name, minVisits }" });
      }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "gstPercentage")) {
      const gst = Number(patch.gstPercentage);
      if (Number.isNaN(gst) || gst < 0 || gst > 100) {
        return res.status(400).json({ error: "gstPercentage must be a number between 0 and 100" });
      }
      patch.gstPercentage = gst;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "maxCapacity")) {
      const cap = Number(patch.maxCapacity);
      if (Number.isNaN(cap) || cap < 1) {
        return res.status(400).json({ error: "maxCapacity must be a positive number" });
      }
      patch.maxCapacity = cap;
    }

    const updated = await updateSettings(patch);
    await logActivity(req, {
      user: req.user,
      action: "settings_update",
      details: `Updated fields: ${Object.keys(patch).join(", ") || "(none)"}`,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update settings", details: err.message });
  }
});

// POST /api/settings/reset — restore factory defaults (handy if staff mess
// up pricing badly and want a clean slate). Admin-only.
router.post("/reset", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    await Settings.deleteOne({ key: "app_settings" });
    await Settings.create({ key: "app_settings" });
    const cached = await loadSettings();
    await logActivity(req, { user: req.user, action: "settings_reset" });
    res.json(cached);
  } catch (err) {
    res.status(500).json({ error: "Failed to reset settings", details: err.message });
  }
});

export default router;
