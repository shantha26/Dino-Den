import mongoose from "mongoose";

const { Schema } = mongoose;

// Default message templates with placeholder variables
export const DEFAULT_NOTIFICATION_TEMPLATES = {
  bookingConfirmation: {
    enabled: true,
    channels: { whatsapp: true, email: true },
    subject: "Booking Confirmed – {{businessName}}",
    body: "Hi {{parentName}}! 🦕 Thank you for visiting {{businessName}}! Your booking for {{date}} at {{timeIn}} is confirmed and {{kidName}} is all set for an amazing time. Total: ₹{{grandTotal}}. See you soon!",
  },
  paymentReceipt: {
    enabled: true,
    channels: { whatsapp: true, email: true },
    subject: "Payment Receipt – {{businessName}}",
    body: "Hi {{parentName}}! 🧾 Payment received: ₹{{grandTotal}} via {{paymentMethod}}. Invoice for {{kidName}}'s visit on {{date}}. Subtotal: ₹{{subtotal}}, GST: ₹{{gstAmount}}. Thank you!",
  },
  birthdayWish: {
    enabled: true,
    channels: { whatsapp: true, email: true },
    subject: "Happy Birthday {{kidName}}! 🎂 – {{businessName}}",
    body: "🎉 Happy Birthday, {{kidName}}! The whole {{businessName}} team wishes you a dino-mite day! Come celebrate with us and enjoy a special birthday treat. We love having you here! 🦖🎈",
  },
  upcomingOffer: {
    enabled: true,
    channels: { whatsapp: true, email: false },
    subject: "Special Offer Just for You – {{businessName}}",
    body: "Hey {{parentName}}! 🌟 We have an exciting offer at {{businessName}} just for you: {{offerTitle}} – {{offerDescription}}. Valid till {{offerExpiry}}. Don't miss out!",
  },
  membershipReminder: {
    enabled: true,
    channels: { whatsapp: true, email: true },
    subject: "You're a {{membershipTier}} Member – {{businessName}}",
    body: "Hi {{parentName}}! 🏅 {{kidName}} is now a {{membershipTier}} member at {{businessName}} with {{totalVisits}} visits. Keep visiting to unlock more rewards. You've earned {{loyaltyPoints}} loyalty points!",
  },
  feedbackRequest: {
    enabled: true,
    channels: { whatsapp: true, email: true },
    subject: "How was {{kidName}}'s visit? – {{businessName}}",
    body: "Hi {{parentName}}! We hope {{kidName}} had a wonderful time at {{businessName}} on {{date}}. We'd love to hear your feedback! Reply to this message or visit us to share your thoughts. Your opinion matters! 🌟",
  },
  reviewRequest: {
    enabled: false,
    channels: { whatsapp: false, email: true },
    subject: "Leave us a Review – {{businessName}}",
    body: "Hi {{parentName}}! Thank you for choosing {{businessName}} for {{kidName}}'s playtime. If you enjoyed your visit, we'd really appreciate a quick review — it helps other families find us! 🦕 Thank you!",
  },
  promotionalMessage: {
    enabled: false,
    channels: { whatsapp: true, email: false },
    subject: "Exciting News from {{businessName}}! 🎉",
    body: "Hey {{parentName}}! Big news from {{businessName}}! {{promoMessage}} We miss {{kidName}} and can't wait to see you again! Book now and make some memories. 🦖",
  },
};

const SettingsSchema = new Schema(
  {
    key: { type: String, default: "app_settings", unique: true },

    businessName: { type: String, default: "Kids Play Area Management System", trim: true },
    logo: { type: String, default: "" },

    gstPercentage: { type: Number, default: 0, min: 0, max: 100 },

    maxCapacity: { type: Number, default: 40, min: 1 },
    avgSessionMinutes: { type: Number, default: 60, min: 1 },

    softPlayPricing: {
      type: [
        {
          _id: false,
          key: { type: String, required: true },
          label: { type: String, required: true },
          price: { type: Number, required: true, min: 0 },
          emoji: { type: String, default: "🎟️" },
        },
      ],
      default: () => [
        { key: "half_hour_soft_play", label: "Half Hour Soft Play", price: 200, emoji: "🥚" },
        { key: "unlimited_soft_play", label: "Unlimited Soft Play", price: 300, emoji: "🦕" },
        { key: "unlimited_soft_play_arcade", label: "Unlimited Soft Play + 6 Arcade Coins", price: 500, emoji: "🦖" },
      ],
    },

    arcadePricing: {
      coinPrice: { type: Number, default: 40, min: 0 },
    },

    basketballPricing: {
      price: { type: Number, default: 80, min: 0 },
    },

    gamingPricing: {
      ps3: {
        label: { type: String, default: "PS3" },
        pricePerHour: { type: Number, default: 50, min: 0 },
      },
      ps5: {
        label: { type: String, default: "PS5" },
        pricePerHour: { type: Number, default: 100, min: 0 },
      },
    },

    socksPricing: {
      kid: {
        label: { type: String, default: "Kid Socks" },
        price: { type: Number, default: 20, min: 0 },
      },
      adult: {
        label: { type: String, default: "Adult Socks" },
        price: { type: Number, default: 30, min: 0 },
      },
    },

    membershipPlans: {
      type: [
        {
          _id: false,
          name: { type: String, required: true },
          minVisits: { type: Number, required: true, min: 0 },
        },
      ],
      default: () => [
        { name: "VIP", minVisits: 20 },
        { name: "Gold", minVisits: 10 },
        { name: "Silver", minVisits: 5 },
        { name: "Regular", minVisits: 2 },
        { name: "New", minVisits: 0 },
      ],
    },

    // ── Notification configuration ──────────────────────────────────────────
    notifications: {
      whatsapp: {
        provider: { type: String, default: "twilio", enum: ["twilio", "wati", "gupshup", "none"] },
        apiKey: { type: String, default: "" },
        apiSecret: { type: String, default: "" },
        fromNumber: { type: String, default: "" },
      },
      email: {
        provider: { type: String, default: "smtp", enum: ["smtp", "sendgrid", "mailgun", "none"] },
        apiKey: { type: String, default: "" },
        fromEmail: { type: String, default: "" },
        fromName: { type: String, default: "" },
        smtpHost: { type: String, default: "" },
        smtpPort: { type: Number, default: 587 },
        smtpUser: { type: String, default: "" },
        smtpPass: { type: String, default: "" },
      },
      templates: {
        type: Schema.Types.Mixed,
        default: () => DEFAULT_NOTIFICATION_TEMPLATES,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", SettingsSchema);
