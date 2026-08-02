import { Router } from "express";
import User, { ROLES } from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import { signAuthToken, generateRawToken, hashToken } from "../utils/authTokens.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/authEmail.js";
import { logActivity } from "../utils/activityLog.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const DEFAULT_ADMIN_SECURITY_PASSWORD = "0806"; // matches the legacy front-desk PIN
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function isStrongEnough(password) {
  return typeof password === "string" && password.length >= 8;
}

// ── Sign up ──────────────────────────────────────────────────────────────────
// Accounts are created with the requested role (admin or staff), or default to staff
// (or admin for the initial bootstrap account). All accounts are auto-verified
// and logged straight in on signup.
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (!isStrongEnough(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const requestedRole = (role || "").toString().toLowerCase().trim();
    const assignedRole = (requestedRole && ROLES.includes(requestedRole)) ? requestedRole : "admin";

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: assignedRole,
      isVerified: true,
    });
    await user.setPassword(password);

    if (assignedRole === "admin") {
      await user.setAdminSecurityPassword(DEFAULT_ADMIN_SECURITY_PASSWORD);
    }

    user.lastLoginAt = new Date();
    await user.save();
    await logActivity(req, {
      user,
      action: "signup",
      details: `${assignedRole} account created`,
    });

    const token = signAuthToken(user, { rememberMe: false });
    await logActivity(req, { user, action: "login_success", details: "Auto-login after signup" });

    return res.status(201).json({
      message: `${assignedRole === "admin" ? "Admin" : "Staff"} account created.`,
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Email verification ──────────────────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing verification token." });

    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ error: "That verification link is invalid or has expired." });
    }

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();
    await logActivity(req, { user, action: "email_verified" });

    res.json({ message: "Email verified! You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
    // Same response whether or not the account exists, to avoid leaking
    // which emails are registered.
    if (user && !user.isVerified) {
      const rawToken = generateRawToken();
      user.emailVerificationToken = hashToken(rawToken);
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      await sendVerificationEmail(user, rawToken);
    }
    res.json({ message: "If that account needs verifying, a new email is on its way." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Login ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      await logActivity(req, { user: { email }, action: "login_failed", details: "No such account", success: false });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      await logActivity(req, { user, action: "login_blocked", details: `Account locked, ${minutesLeft}m remaining`, success: false });
      return res.status(423).json({ error: `Too many failed attempts. Try again in ${minutesLeft} minute(s).` });
    }

    const valid = await user.checkPassword(password);
    if (!valid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      await logActivity(req, { user, action: "login_failed", details: "Wrong password", success: false });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.isVerified) {
      await logActivity(req, { user, action: "login_failed", details: "Email not verified", success: false });
      return res.status(403).json({ error: "Please verify your email before logging in.", requiresVerification: true });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signAuthToken(user, { rememberMe: !!rememberMe });
    await logActivity(req, { user, action: "login_success", details: rememberMe ? "Remember me enabled" : "" });

    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  await logActivity(req, { user: req.user, action: "logout" });
  res.json({ message: "Logged out." });
});

// ── Forgot / reset password ────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
    if (user) {
      const rawToken = generateRawToken();
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await sendPasswordResetEmail(user, rawToken);
      await logActivity(req, { user, action: "password_reset_requested" });
    }
    // Generic response regardless of whether the account exists.
    res.json({ message: "If that email is registered, a reset link is on its way." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: "Missing token or new password." });
    }
    if (!isStrongEnough(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ error: "That reset link is invalid or has expired." });
    }

    await user.setPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();
    await logActivity(req, { user, action: "password_reset_completed" });

    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Current user ─────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

// ── Admin Security Password (extra gate in front of the Settings page) ──────
router.post("/verify-admin-security", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { password } = req.body || {};

    // Auto-heal: if this admin account somehow has no security password hash,
    // set it to the default "0806" so they are never permanently locked out.
    if (!req.user.adminSecurityPasswordHash) {
      await req.user.setAdminSecurityPassword(DEFAULT_ADMIN_SECURITY_PASSWORD);
      await req.user.save();
    }

    const ok = await req.user.checkAdminSecurityPassword(password || "");
    await logActivity(req, {
      user: req.user,
      action: ok ? "settings_unlock_success" : "settings_unlock_failed",
      success: ok,
    });
    if (!ok) return res.status(403).json({ error: "Incorrect admin security password." });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-admin-security — resets the calling admin's security
// password back to the default "0806". Useful if the password was changed
// and then forgotten. Requires a valid admin JWT (you must be logged in).
router.post("/reset-admin-security", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    await req.user.setAdminSecurityPassword(DEFAULT_ADMIN_SECURITY_PASSWORD);
    await req.user.save();
    await logActivity(req, { user: req.user, action: "admin_security_reset_to_default" });
    res.json({ message: `Admin security password reset to default.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin-security", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof newPassword !== "string" || newPassword.length < 4) {
      return res.status(400).json({ error: "New security password must be at least 4 characters." });
    }
    const ok = await req.user.checkAdminSecurityPassword(currentPassword || "");
    if (!ok) {
      await logActivity(req, { user: req.user, action: "admin_security_change_failed", success: false });
      return res.status(403).json({ error: "Current admin security password is incorrect." });
    }
    await req.user.setAdminSecurityPassword(newPassword);
    await req.user.save();
    await logActivity(req, { user: req.user, action: "admin_security_changed" });
    res.json({ message: "Admin security password updated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Staff / user management (admin only) ─────────────────────────────────────
router.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map((u) => u.toSafeJSON()));
});

// Admin-created accounts are auto-verified — the admin is vouching for them
// directly, so there's no need to round-trip through email.
router.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${ROLES.join(", ")}` });
    }
    if (!isStrongEnough(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: "An account with that email already exists." });

    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), role, isVerified: true });
    await user.setPassword(password);
    if (role === "admin") await user.setAdminSecurityPassword(DEFAULT_ADMIN_SECURITY_PASSWORD);
    await user.save();

    await logActivity(req, { user: req.user, action: "staff_created", details: `Created ${role} account for ${user.email}` });
    res.status(201).json(user.toSafeJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${ROLES.join(", ")}` });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });

    if (target._id.equals(req.user._id) && role !== "admin") {
      const remainingAdmins = await User.countDocuments({ role: "admin", _id: { $ne: target._id } });
      if (remainingAdmins === 0) {
        return res.status(400).json({ error: "You can't remove the last admin's admin role." });
      }
    }

    const previousRole = target.role;
    target.role = role;
    if (role === "admin" && !target.adminSecurityPasswordHash) {
      await target.setAdminSecurityPassword(DEFAULT_ADMIN_SECURITY_PASSWORD);
    }
    await target.save();
    await logActivity(req, {
      user: req.user,
      action: "role_changed",
      details: `${target.email}: ${previousRole} → ${role}`,
    });
    res.json(target.toSafeJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ error: "You can't delete your own account while logged in." });
    }
    if (target.role === "admin") {
      const remainingAdmins = await User.countDocuments({ role: "admin", _id: { $ne: target._id } });
      if (remainingAdmins === 0) {
        return res.status(400).json({ error: "You can't delete the last admin account." });
      }
    }
    await target.deleteOne();
    await logActivity(req, { user: req.user, action: "staff_deleted", details: target.email });
    res.json({ message: "User removed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Activity log (admin only) ────────────────────────────────────────────────
router.get("/activity-logs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
