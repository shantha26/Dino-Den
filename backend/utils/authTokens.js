import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";

// "Remember me" simply widens the token's lifetime rather than switching
// storage mechanisms server-side — the frontend decides localStorage vs
// sessionStorage, but the token itself needs a matching expiry either way.
export function signAuthToken(user, { rememberMe = false } = {}) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: rememberMe ? "30d" : "12h" }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Random URL-safe tokens for email verification / password reset links.
export function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
