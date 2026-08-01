import mongoose from "mongoose";

const { Schema } = mongoose;

const PromoCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ["flat", "percentage"], required: true },
    // ₹ amount for "flat", 0-100 for "percentage"
    value: { type: Number, required: true, min: 0 },
    // Only meaningful for percentage codes — caps how much ₹ a big bill can save.
    maxDiscountAmount: { type: Number },
    description: { type: String, trim: true },

    // Festival offers are just promo codes flagged for display purposes
    // (e.g. shown with a banner, surfaced to waitlisted families) —
    // no separate collection needed.
    isFestival: { type: Boolean, default: false },
    festivalName: { type: String, trim: true },

    // Optional validity window, "YYYY-MM-DD" to match the rest of the app's date fields.
    startDate: { type: String },
    endDate: { type: String },

    maxUses: { type: Number }, // omit for unlimited
    usedCount: { type: Number, default: 0 },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("PromoCode", PromoCodeSchema);
