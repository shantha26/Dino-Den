import ActivityLog from "../models/ActivityLog.js";

// Fire-and-forget logging — a logging failure should never break the
// request it's describing, so errors are swallowed (and noted on stderr).
export async function logActivity(req, { user, action, details = "", success = true }) {
  try {
    await ActivityLog.create({
      user: user?._id || user?.id || null,
      userEmail: user?.email || "",
      role: user?.role || "",
      action,
      details,
      success,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || "",
      userAgent: req?.headers?.["user-agent"] || "",
    });
  } catch (err) {
    console.error("[activityLog] failed to record entry:", err.message);
  }
}
