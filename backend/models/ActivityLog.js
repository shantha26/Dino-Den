import mongoose from "mongoose";

const { Schema } = mongoose;

// Broad, extensible action list rather than a strict enum — new call sites
// can log a new action string without a migration.
const ActivityLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: "" },
    role: { type: String, default: "" },
    action: { type: String, required: true }, // e.g. "login_success", "login_failed", "signup", "settings_update"
    details: { type: String, default: "" },
    success: { type: Boolean, default: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

export default mongoose.model("ActivityLog", ActivityLogSchema);
