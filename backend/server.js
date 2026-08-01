import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import customerRoutes from "./routes/customers.js";
import waitlistRoutes from "./routes/waitlist.js";
import promoCodeRoutes from "./routes/promoCodes.js";
import settingsRoutes from "./routes/settings.js";
import notificationRoutes from "./routes/notifications.js";
import authRoutes from "./routes/auth.js";
import { loadSettings } from "./config/settingsCache.js";
import { requireAuth } from "./middleware/auth.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/kids_play_area";

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
// Raised from Express's 100kb default so a base64-encoded logo upload from
// the Settings page (validated client-side up to ~1.5MB) doesn't get
// rejected as "payload too large".
app.use(express.json({ limit: "3mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbState: mongoose.connection.readyState });
});

// Auth routes are unprotected by design (signup/login/verify/reset all
// happen before a token exists). Everything else requires a valid session
// except GET /api/settings, which stays public so the login screen can show
// the business name/logo before anyone signs in (see routes/settings.js).
app.use("/api/auth", authRoutes);
app.use("/api/customers", requireAuth, customerRoutes);
app.use("/api/waitlist", requireAuth, waitlistRoutes);
app.use("/api/promo-codes", requireAuth, promoCodeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", requireAuth, notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    // Populate the in-memory settings cache (creating the default document
    // on first run) before the server starts accepting requests, since
    // pricing/capacity reads throughout the app assume it's already loaded.
    await loadSettings();
    console.log("Settings loaded");

    // Reset every admin account's security password to "0806" on every
    // startup. This guarantees the Settings gate always works with the
    // known default PIN regardless of what was previously stored in the DB.
    // Admins can change it from Settings → Security after unlocking.
    try {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await admin.setAdminSecurityPassword("0806");
        await admin.save();
        console.log(`  ↳ Admin security password reset to 0806: ${admin.email}`);
      }
      if (admins.length > 0) {
        console.log(`Admin security password reset: ${admins.length} account(s) updated.`);
      }
    } catch (err) {
      console.warn("Admin security password reset warning:", err.message);
    }

    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Without this, a port conflict crashes the process with a raw
    // stack trace and nodemon just sits there "waiting for file changes" —
    // confusing for anyone who isn't reading a stack trace. This gives a
    // clear, actionable message instead and exits so nodemon can be re-run
    // once the port is freed.
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `\nPort ${PORT} is already in use — another process (often a previous ` +
            `copy of this same server) is already listening on it.\n\n` +
            `Windows: find and stop it with:\n` +
            `  netstat -ano | findstr :${PORT}\n` +
            `  taskkill /PID <the PID from the last column> /F\n\n` +
            `macOS/Linux:\n` +
            `  lsof -i :${PORT}\n` +
            `  kill -9 <PID>\n\n` +
            `Or set a different PORT in backend/.env (and update VITE_API_URL ` +
            `in frontend/.env to match), then restart.\n`
        );
      } else {
        console.error("Server failed to start:", err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
