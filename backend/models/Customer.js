
import mongoose from "mongoose";

const { Schema } = mongoose;

// Each document represents one visit/booking.
const CustomerSchema = new Schema(
  {
    parentName: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    kidName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
    },

    dob: { type: Date },

    additionalKids: [
      {
        _id: false,
        kidName: { type: String, trim: true },
        dob: { type: Date },
        package: { type: String, trim: true, default: "" },
        packageLabel: { type: String, trim: true, default: "" },
      },
    ],

    date: { type: String, required: true },
    timeIn: { type: String, required: true },
    timeOut: { type: String },

    paymentMethod: {
      type: String,
      enum: ["cash", "gpay", "split"],
      default: "cash",
    },

    splitPayment: {
      cashAmount: { type: Number, default: 0 },
      gpayAmount: { type: Number, default: 0 },
    },

    // Supports dynamically added package keys.
    // Existing package keys and quantities remain compatible.
    playPackages: {
      type: Map,
      of: {
        type: Number,
        min: 0,
      },
      default: () => ({
        half_hour_soft_play: 0,
        unlimited_soft_play: 0,
        unlimited_soft_play_arcade: 0,
      }),
    },

    arcadeCoins: { type: Number, default: 0 },
    basketballQty: { type: Number, default: 0 },

    gaming: {
      ps3Hours: { type: Number, default: 0 },
      ps5Hours: { type: Number, default: 0 },
    },

    socks: {
      kidQty: { type: Number, default: 0 },
      adultQty: { type: Number, default: 0 },
    },

    billing: {
      playPackageCost: { type: Number, default: 0 },
      arcadeCost: { type: Number, default: 0 },
      gamingCost: { type: Number, default: 0 },
      socksCost: { type: Number, default: 0 },
      subtotal: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      promoCode: { type: String, trim: true, uppercase: true },
      gstAmount: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },

      // Incremental billing support.
      amountPaid: { type: Number, default: 0 },
      lastPaymentAmount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Customer", CustomerSchema);
