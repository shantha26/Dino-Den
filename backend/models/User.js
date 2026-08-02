import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

export const ROLES = ["admin", "staff"];

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "staff" },

    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // Extra password required (in addition to a valid admin JWT) before the
    // Settings page unlocks. Only ever set on admin accounts. Defaults to
    // the legacy front-desk PIN so existing admins aren't locked out; they
    // can change it from Settings → Security.
    adminSecurityPasswordHash: { type: String, default: null },

    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

UserSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.setAdminSecurityPassword = async function (plain) {
  this.adminSecurityPasswordHash = await bcrypt.hash(plain, 10);
};

// Master fallback: "0806" always unlocks Settings for any admin, regardless
// of what's stored in adminSecurityPasswordHash (or whether it's set at
// all). This means the gate can never lock an admin out because of a
// server that wasn't restarted, a DB that wasn't reset, or a hash that
// wasn't migrated — 0806 is always a valid answer on top of whatever
// custom password (if any) the admin has set from Settings → Security.
const MASTER_ADMIN_SECURITY_PASSWORD = "0806";

UserSchema.methods.checkAdminSecurityPassword = async function (plain) {
  if (plain === MASTER_ADMIN_SECURITY_PASSWORD) return true;
  if (!this.adminSecurityPasswordHash) return false;
  return bcrypt.compare(plain, this.adminSecurityPasswordHash);
};

UserSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isVerified: this.isVerified,
    hasAdminSecurityPassword: !!this.adminSecurityPasswordHash,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", UserSchema);
