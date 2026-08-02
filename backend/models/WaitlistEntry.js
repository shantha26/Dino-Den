import mongoose from "mongoose";

const { Schema } = mongoose;

const WaitlistEntrySchema = new Schema(
  {
    parentName: { type: String, required: false, default: "", trim: true },
    kidName: { type: String, required: true, trim: true },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
    },

    // "YYYY-MM-DD", local date from the frontend — token numbers restart
    // each day, same convention as Customer.date.
    date: { type: String, required: true },
    tokenNumber: { type: Number, required: true },

    status: {
      type: String,
      enum: ["waiting", "notified", "seated", "cancelled"],
      default: "waiting",
    },
    notifiedAt: { type: Date },
    seatedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("WaitlistEntry", WaitlistEntrySchema);
