// Notification dispatch utility
// Handles template rendering with variable substitution and simulates
// sending via WhatsApp (Twilio/WATI/Gupshup) and Email (SMTP/SendGrid/Mailgun).
// All actual API calls are stubbed — replace stubs with real SDK calls once
// credentials are configured.

import { getSettings } from "../config/settingsCache.js";

// ── Template variable renderer ────────────────────────────────────────────────
// Replaces {{varName}} placeholders in a string with values from a data map.
export function renderTemplate(template, data) {
  return template.replace(/{{(\w+)}}/g, (_, key) =>
    data[key] !== undefined && data[key] !== null ? String(data[key]) : `{{${key}}}`
  );
}

// ── Build variable map from a booking/customer context object ─────────────────
export function buildTemplateVars(ctx) {
  const settings = getSettings();
  return {
    businessName: settings.businessName || "Kids Play Area",
    parentName: ctx.parentName || "",
    kidName: ctx.kidName || "",
    mobileNumber: ctx.mobileNumber || "",
    date: ctx.date || "",
    timeIn: ctx.timeIn || "",
    timeOut: ctx.timeOut || "",
    paymentMethod:
      ctx.paymentMethod === "split"
        ? `Split Payment (Cash ₹${ctx.splitPayment?.cashAmount ?? 0} + GPay ₹${ctx.splitPayment?.gpayAmount ?? 0})`
        : ctx.paymentMethod === "gpay"
        ? "Google Pay"
        : "Cash",
    cashAmount: ctx.paymentMethod === "split" ? ctx.splitPayment?.cashAmount ?? 0 : ctx.paymentMethod === "cash" ? ctx.billing?.grandTotal ?? 0 : 0,
    gpayAmount: ctx.paymentMethod === "split" ? ctx.splitPayment?.gpayAmount ?? 0 : ctx.paymentMethod === "gpay" ? ctx.billing?.grandTotal ?? 0 : 0,
    grandTotal: ctx.billing?.grandTotal ?? 0,
    subtotal: ctx.billing?.subtotal ?? 0,
    gstAmount: ctx.billing?.gstAmount ?? 0,
    discountAmount: ctx.billing?.discountAmount ?? 0,
    promoCode: ctx.billing?.promoCode || "",
    totalVisits: ctx.totalVisits || 0,
    loyaltyPoints: ctx.loyaltyPoints || 0,
    membershipTier: ctx.membership || "",
    offerTitle: ctx.offerTitle || "",
    offerDescription: ctx.offerDescription || "",
    offerExpiry: ctx.offerExpiry || "",
    promoMessage: ctx.promoMessage || "",
  };
}

// ── WhatsApp dispatch ──────────────────────────────────────────────────────
// Sends via whichever provider is configured in Settings → Notifications.
// Credential field mapping (matches the Settings UI):
//   Twilio:   apiKey = Account SID, apiSecret = Auth Token, fromNumber = Twilio WhatsApp number
//   WATI:     apiKey = API token (Bearer),                  fromNumber = not required
//   Gupshup:  apiKey = API key,                              fromNumber = registered WA source number
async function sendWhatsApp(to, message, provider, creds) {
  // Normalize Indian numbers: strip leading 0, add +91 if needed
  let normalized = String(to).replace(/\D/g, "");
  if (normalized.length === 10) normalized = `+91${normalized}`;
  else if (!normalized.startsWith("+")) normalized = `+${normalized}`;

  if (provider === "none" || !creds?.apiKey) {
    console.log(`[NOTIFY][WhatsApp] → ${normalized} SKIPPED (provider not configured)`);
    return { sent: false, reason: "WhatsApp provider not configured" };
  }

  try {
    if (provider === "twilio") {
      const accountSid = creds.apiKey;
      const authToken = creds.apiSecret;
      const from = creds.fromNumber?.startsWith("whatsapp:") ? creds.fromNumber : `whatsapp:${creds.fromNumber}`;
      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: `whatsapp:${normalized}`, Body: message }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || `Twilio responded ${resp.status}`);
      console.log(`[NOTIFY][WhatsApp][twilio] sent → ${normalized} (sid ${data.sid})`);
      return { sent: true, channel: "whatsapp", provider, to: normalized, id: data.sid };
    }

    if (provider === "wati") {
      const digitsOnly = normalized.replace("+", "");
      const resp = await fetch(
        `https://live-mt-server.wati.io/api/v1/sendSessionMessage/${digitsOnly}?messageText=${encodeURIComponent(message)}`,
        { method: "POST", headers: { Authorization: `Bearer ${creds.apiKey}` } }
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.result === false) throw new Error(data?.info || `WATI responded ${resp.status}`);
      console.log(`[NOTIFY][WhatsApp][wati] sent → ${normalized}`);
      return { sent: true, channel: "whatsapp", provider, to: normalized };
    }

    if (provider === "gupshup") {
      const resp = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
        method: "POST",
        headers: { apikey: creds.apiKey, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: creds.fromNumber,
          destination: normalized.replace("+", ""),
          message: JSON.stringify({ type: "text", text: message }),
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || (data?.status && data.status !== "submitted")) {
        throw new Error(data?.message || `Gupshup responded ${resp.status}`);
      }
      console.log(`[NOTIFY][WhatsApp][gupshup] sent → ${normalized}`);
      return { sent: true, channel: "whatsapp", provider, to: normalized };
    }

    return { sent: false, reason: `Unknown WhatsApp provider: ${provider}` };
  } catch (err) {
    console.error(`[NOTIFY][WhatsApp][${provider}] FAILED → ${normalized}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

// ── Email dispatch stub ───────────────────────────────────────────────────────
async function sendEmail(to, subject, body, provider, creds) {
  console.log(`[NOTIFY][Email][${provider}] → ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Body: ${body.slice(0, 120)}${body.length > 120 ? "…" : ""}`);

  if (provider === "none" || !creds?.fromEmail) {
    return { sent: false, reason: "Email provider not configured" };
  }

  // ── Real API integration points (uncomment + install SDKs) ──────────────
  // SMTP via nodemailer:
  // const nodemailer = require("nodemailer");
  // const transporter = nodemailer.createTransport({ host: creds.smtpHost, port: creds.smtpPort,
  //   auth: { user: creds.smtpUser, pass: creds.smtpPass } });
  // await transporter.sendMail({ from: `"${creds.fromName}" <${creds.fromEmail}>`, to, subject, text: body });

  // SendGrid:
  // const sgMail = require("@sendgrid/mail");
  // sgMail.setApiKey(creds.apiKey);
  // await sgMail.send({ to, from: { email: creds.fromEmail, name: creds.fromName }, subject, text: body });

  // Mailgun:
  // const formData = require("form-data"); const Mailgun = require("mailgun.js");
  // const mg = new Mailgun(formData).client({ username: "api", key: creds.apiKey });
  // await mg.messages.create(creds.domain, { from: `${creds.fromName} <${creds.fromEmail}>`, to, subject, text: body });

  return { sent: true, channel: "email", provider, to };
}

// ── Main dispatch function ────────────────────────────────────────────────────
// eventKey: one of the template keys (bookingConfirmation, paymentReceipt, etc.)
// ctx: the customer/booking context object for variable substitution
// customerEmail: optional email address (stored separately from mobile)
export async function sendNotification(eventKey, ctx, customerEmail = null) {
  const settings = getSettings();
  const notifConfig = settings.notifications || {};
  const templates = notifConfig.templates || {};
  const tmpl = templates[eventKey];

  if (!tmpl) {
    return { skipped: true, reason: `No template for event: ${eventKey}` };
  }
  if (!tmpl.enabled) {
    return { skipped: true, reason: `Notification disabled for: ${eventKey}` };
  }

  const vars = buildTemplateVars(ctx);
  const renderedBody = renderTemplate(tmpl.body, vars);
  const renderedSubject = renderTemplate(tmpl.subject || "", vars);

  const results = [];
  const waCreds = notifConfig.whatsapp || {};
  const emailCreds = notifConfig.email || {};

  // WhatsApp
  if (tmpl.channels?.whatsapp && ctx.mobileNumber) {
    const r = await sendWhatsApp(ctx.mobileNumber, renderedBody, waCreds.provider || "none", waCreds);
    results.push(r);
  }

  // Email — only if customer has an email stored or passed in
  const emailTo = customerEmail || ctx.email || null;
  if (tmpl.channels?.email && emailTo) {
    const r = await sendEmail(emailTo, renderedSubject, renderedBody, emailCreds.provider || "none", emailCreds);
    results.push(r);
  }

  return { eventKey, results };
}

// ── Convenience wrappers for each event type ──────────────────────────────────

export const notifyBookingConfirmation = (customer, email) =>
  sendNotification("bookingConfirmation", customer, email);

export const notifyPaymentReceipt = (customer, email) =>
  sendNotification("paymentReceipt", customer, email);

export const notifyBirthdayWish = (customer, email) =>
  sendNotification("birthdayWish", customer, email);

export const notifyUpcomingOffer = (customer, offerCtx, email) =>
  sendNotification("upcomingOffer", { ...customer, ...offerCtx }, email);

export const notifyMembershipReminder = (customer, email) =>
  sendNotification("membershipReminder", customer, email);

export const notifyFeedbackRequest = (customer, email) =>
  sendNotification("feedbackRequest", customer, email);

export const notifyReviewRequest = (customer, email) =>
  sendNotification("reviewRequest", customer, email);

export const notifyPromotion = (customer, promoCtx, email) =>
  sendNotification("promotionalMessage", { ...customer, ...promoCtx }, email);
