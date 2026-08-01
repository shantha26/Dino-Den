import mongoose from "mongoose";

const { Schema } = mongoose;

// Each document represents one visit/booking. A returning customer simply
// gets a new visit document — this keeps history and reporting simple, and
// leaves room for a separate "memberships" collection later.
const CustomerSchema = new Schema(
  {
    parentName: { type: String, required: true, trim: true },
    kidName: { type: String, required: true, trim: true },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
    },
    dob: { type: Date }, // date of birth — age is derived from this, not stored separately

    // A single booking can cover more than one child for the same parent visit
    // (e.g. two siblings checking in together). The primary child stays in
    // kidName/dob above for backward compatibility with birthdays, directory
    // search, etc.; any siblings on the same booking go here.
    additionalKids: [
      {
        _id: false,
        kidName: { type: String, trim: true },
        dob: { type: Date },
        // "<category>:<key>" value the staff picked in this kid's package
        // dropdown (e.g. "play:half_hour_soft_play"), plus a human-readable
        // snapshot of the label at booking time so reports/CSV exports don't
        // need to re-look-up settings (which may change price/labels later).
        package: { type: String, trim: true, default: "" },
        packageLabel: { type: String, trim: true, default: "" },
      },
    ],

    date: { type: String, required: true }, // YYYY-MM-DD, auto-filled by frontend (local time)
    timeIn: { type: String, required: true }, // HH:MM, auto-filled by frontend (local time)
    timeOut: { type: String }, // optional, filled when the visit ends

    paymentMethod: { type: String, enum: ["cash", "gpay", "split"], default: "cash" },

    // Only populated when paymentMethod is "split" — the two amounts always
    // sum to billing.grandTotal (enforced both client-side and here on save).
    splitPayment: {
      cashAmount: { type: Number, default: 0 },
      gpayAmount: { type: Number, default: 0 },
    },

    playPackages: {
      half_hour_soft_play: { type: Number, default: 0 },
      unlimited_soft_play: { type: Number, default: 0 },
      unlimited_soft_play_arcade: { type: Number, default: 0 },
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

      // Incremental-billing support: `amountPaid` is the running total actually
      // collected from the customer across the initial booking and every edit
      // since (so it only ever grows). `lastPaymentAmount` is just the slice
      // collected in the most recent transaction — the full total on create,
      // or the "Amount Due Now" on an edit that added paid services. Together
      // these let an edit compute how much MORE (if anything) is owed instead
      // of re-charging for services the customer already paid for.
      amountPaid: { type: Number, default: 0 },
      lastPaymentAmount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Customer", CustomerSchema);
