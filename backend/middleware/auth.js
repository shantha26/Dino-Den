import { verifyAuthToken } from "../utils/authTokens.js";
import User from "../models/User.js";

// Attaches req.user (full Mongoose doc) when a valid bearer token is
// present; rejects the request otherwise. Kept separate from role checks so
// routes can compose `requireAuth, requireRole("admin")`.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

// requireRole("admin", "staff") — call after requireAuth.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
    next();
  };
}
