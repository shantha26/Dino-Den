import { Router } from "express";
import { getSettings, updateSettings } from "../config/settingsCache.js";
import {
  sendNotification,
  renderTemplate,
  buildTemplateVars,
  notifyUpcomingOffer,
} from "../utils/notifications.js";
import Customer from "../models/Customer.js";
import { buildCustomerProfile, computeLoyaltyPoints, computeMembershipTier } from "../utils/customerInsights.js";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "../models/Settings.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

// ── GET /api/notifications/config ────────────────────────────────────────────
// Returns current notification configuration (credentials masked).
router.get("/config", (req, res) => {
  const settings = getSettings();
  const notif = settings.notifications || {};

  // Mask sensitive fields before sending to client
  const masked = {
    whatsapp: {
      provider: notif.whatsapp?.provider || "none",
      fromNumber: notif.whatsapp?.fromNumber || "",
      apiKey: notif.whatsapp?.apiKey ? "••••••••" : "",
      apiSecret: notif.whatsapp?.apiSecret ? "••••••••" : "",
      configured: !!(notif.whatsapp?.apiKey && notif.whatsapp?.fromNumber),
    },
    email: {
      provider: notif.email?.provider || "none",
      fromEmail: notif.email?.fromEmail || "",
      fromName: notif.email?.fromName || "",
      apiKey: notif.email?.apiKey ? "••••••••" : "",
      smtpHost: notif.email?.smtpHost || "",
      smtpPort: notif.email?.smtpPort || 587,
      smtpUser: notif.email?.smtpUser || "",
      smtpPass: notif.email?.smtpPass ? "••••••••" : "",
      configured: !!(notif.email?.fromEmail && (notif.email?.apiKey || notif.email?.smtpHost)),
    },
    templates: notif.templates || DEFAULT_NOTIFICATION_TEMPLATES,
  };

  res.json(masked);
});

// ── PUT /api/notifications/config ────────────────────────────────────────────
// Saves notification settings (credentials + templates).
// Merges carefully so a "••••••••" placeholder never overwrites a real secret.
router.put("/config", requireRole("admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const current = getSettings();
    const currentNotif = current.notifications || {};

    // Helper: keep existing value if incoming value is the masked placeholder
    const unmasked = (incoming, existing) =>
      incoming === "••••••••" || incoming === undefined ? existing : incoming;

    const patch = {
      notifications: {
        whatsapp: {
          provider: body.whatsapp?.provider ?? currentNotif.whatsapp?.provider ?? "none",
          fromNumber: body.whatsapp?.fromNumber ?? currentNotif.whatsapp?.fromNumber ?? "",
          apiKey: unmasked(body.whatsapp?.apiKey, currentNotif.whatsapp?.apiKey ?? ""),
          apiSecret: unmasked(body.whatsapp?.apiSecret, currentNotif.whatsapp?.apiSecret ?? ""),
        },
        email: {
          provider: body.email?.provider ?? currentNotif.email?.provider ?? "none",
          fromEmail: body.email?.fromEmail ?? currentNotif.email?.fromEmail ?? "",
          fromName: body.email?.fromName ?? currentNotif.email?.fromName ?? "",
          apiKey: unmasked(body.email?.apiKey, currentNotif.email?.apiKey ?? ""),
          smtpHost: body.email?.smtpHost ?? currentNotif.email?.smtpHost ?? "",
          smtpPort: Number(body.email?.smtpPort) || currentNotif.email?.smtpPort || 587,
          smtpUser: body.email?.smtpUser ?? currentNotif.email?.smtpUser ?? "",
          smtpPass: unmasked(body.email?.smtpPass, currentNotif.email?.smtpPass ?? ""),
        },
        templates: body.templates ?? currentNotif.templates ?? DEFAULT_NOTIFICATION_TEMPLATES,
      },
    };

    await updateSettings(patch);
    res.json({ success: true, message: "Notification settings saved." });
  } catch (err) {
    res.status(400).json({ error: "Failed to save notification settings", details: err.message });
  }
});

// ── POST /api/notifications/send ─────────────────────────────────────────────
// Manually trigger a notification for a specific customer and event.
// Body: { eventKey, customerId?, mobileNumber?, email? }
router.post("/send", async (req, res) => {
  try {
    const { eventKey, customerId, mobileNumber, email, extraContext } = req.body || {};

    if (!eventKey) {
      return res.status(400).json({ error: "eventKey is required" });
    }

    let ctx = {};

    if (customerId) {
      const visits = await Customer.find({ _id: customerId }).lean();
      if (visits.length > 0) ctx = { ...visits[0] };
    } else if (mobileNumber) {
      const visits = await Customer.find({ mobileNumber }).sort({ createdAt: -1 }).lean();
      if (visits.length > 0) {
        const profile = buildCustomerProfile(mobileNumber, visits);
        ctx = { ...visits[0], totalVisits: profile.totalVisits, loyaltyPoints: profile.loyaltyPoints, membership: profile.membership };
      }
    }

    if (extraContext) Object.assign(ctx, extraContext);

    const result = await sendNotification(eventKey, ctx, email || ctx.email);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: "Failed to send notification", details: err.message });
  }
});

// ── POST /api/notifications/send-offer-to-all ────────────────────────────────
// Broadcasts an offer/festival message to every registered customer (deduped
// by mobile number, most recent visit used for name/email context). Uses the
// "upcomingOffer" template, so wording/channels are whatever's configured
// there in Settings → Notifications. Admin-only since this messages your
// entire customer base at once.
router.post("/send-offer-to-all", requireRole("admin"), async (req, res) => {
  try {
    const { offerTitle, offerDescription, offerExpiry } = req.body || {};
    if (!offerTitle || !String(offerTitle).trim()) {
      return res.status(400).json({ error: "offerTitle is required" });
    }

    const allVisits = await Customer.find(
      {},
      "parentName kidName mobileNumber email"
    )
      .sort({ createdAt: -1 })
      .lean();

    // One message per customer, not per visit — keep only their most recent record.
    const uniqueByMobile = new Map();
    for (const v of allVisits) {
      if (v.mobileNumber && !uniqueByMobile.has(v.mobileNumber)) {
        uniqueByMobile.set(v.mobileNumber, v);
      }
    }

    const offerCtx = {
      offerTitle: String(offerTitle).trim(),
      offerDescription: offerDescription ? String(offerDescription).trim() : "",
      offerExpiry: offerExpiry ? String(offerExpiry).trim() : "",
    };

    const results = [];
    for (const customer of uniqueByMobile.values()) {
      const r = await notifyUpcomingOffer(customer, offerCtx, customer.email);
      results.push({
        mobileNumber: customer.mobileNumber,
        parentName: customer.parentName,
        sent: !!r.results?.some((x) => x.sent),
        details: r,
      });
    }

    const sentCount = results.filter((r) => r.sent).length;
    res.json({
      totalCustomers: uniqueByMobile.size,
      sentCount,
      failedCount: uniqueByMobile.size - sentCount,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to send offer broadcast", details: err.message });
  }
});

// ── POST /api/notifications/preview ──────────────────────────────────────────
// Renders a template with sample data so admin can preview before saving.
// Body: { subject, body, sampleVars? }
router.post("/preview", (req, res) => {
  try {
    const { subject, body, sampleVars } = req.body || {};
    const settings = getSettings();

    const defaults = {
      businessName: settings.businessName,
      parentName: "Priya Kumar",
      kidName: "Arjun",
      mobileNumber: "9876543210",
      date: new Date().toISOString().slice(0, 10),
      timeIn: "10:30",
      timeOut: "12:00",
      paymentMethod: "Google Pay",
      grandTotal: "750",
      subtotal: "700",
      gstAmount: "50",
      discountAmount: "0",
      promoCode: "",
      totalVisits: "8",
      loyaltyPoints: "80",
      membershipTier: "Gold",
      offerTitle: "Weekend Special",
      offerDescription: "20% off on all packages",
      offerExpiry: "31 Jul 2026",
      promoMessage: "New PS5 gaming sessions are now available!",
    };

    const vars = { ...defaults, ...(sampleVars || {}) };
    const renderedSubject = renderTemplate(subject || "", vars);
    const renderedBody = renderTemplate(body || "", vars);

    res.json({ renderedSubject, renderedBody, vars });
  } catch (err) {
    res.status(400).json({ error: "Preview failed", details: err.message });
  }
});

// ── POST /api/notifications/send-birthday-wishes ─────────────────────────────
// Bulk-send birthday wishes to all kids whose birthday is today.
router.post("/send-birthday-wishes", async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    const customers = await Customer.find({ dob: { $exists: true, $ne: null } }).lean();

    // Deduplicate by mobile+kidName
    const unique = new Map();
    for (const c of customers) {
      if (!c.dob) continue;
      const dob = new Date(c.dob);
      if (dob.getMonth() === month && dob.getDate() === day) {
        const key = `${c.mobileNumber}-${c.kidName.trim().toLowerCase()}`;
        if (!unique.has(key)) unique.set(key, c);
      }
    }

    const results = [];
    for (const customer of unique.values()) {
      const r = await sendNotification("birthdayWish", customer, customer.email);
      results.push({ kidName: customer.kidName, mobileNumber: customer.mobileNumber, ...r });
    }

    res.json({ count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: "Failed to send birthday wishes", details: err.message });
  }
});

// ── POST /api/notifications/reset-templates ───────────────────────────────────
// Restores all templates to factory defaults.
router.post("/reset-templates", requireRole("admin"), async (req, res) => {
  try {
    const current = getSettings();
    await updateSettings({
      notifications: {
        ...(current.notifications || {}),
        templates: DEFAULT_NOTIFICATION_TEMPLATES,
      },
    });
    res.json({ success: true, templates: DEFAULT_NOTIFICATION_TEMPLATES });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset templates", details: err.message });
  }
});

export default router;
