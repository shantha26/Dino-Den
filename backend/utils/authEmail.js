import nodemailer from "nodemailer";
import { getSettings } from "../config/settingsCache.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Sends via the SMTP credentials configured in Settings → Notifications, if
// present. Otherwise (fresh install, no SMTP configured yet) falls back to
// logging the link to the server console so the flow is still testable
// end-to-end without real email infrastructure.
async function dispatch(to, subject, html, plainLinkForFallback) {
  const emailCfg = getSettings()?.notifications?.email;

  if (emailCfg?.provider === "smtp" && emailCfg?.smtpHost && emailCfg?.smtpUser) {
    try {
      const transporter = nodemailer.createTransport({
        host: emailCfg.smtpHost,
        port: emailCfg.smtpPort || 587,
        secure: (emailCfg.smtpPort || 587) === 465,
        auth: { user: emailCfg.smtpUser, pass: emailCfg.smtpPass },
      });
      await transporter.sendMail({
        from: emailCfg.fromName ? `"${emailCfg.fromName}" <${emailCfg.fromEmail || emailCfg.smtpUser}>` : emailCfg.smtpUser,
        to,
        subject,
        html,
      });
      return { sent: true, mode: "smtp" };
    } catch (err) {
      console.error("[authEmail] SMTP send failed, falling back to console log:", err.message);
    }
  }

  console.log(`[AUTH EMAIL] → ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Link: ${plainLinkForFallback}`);
  return { sent: false, mode: "console" };
}

export async function sendVerificationEmail(user, rawToken) {
  const link = `${CLIENT_ORIGIN}/verify-email?token=${rawToken}`;
  const businessName = getSettings()?.businessName || "Kids Play Area";
  const html = `
    <p>Hi ${user.name},</p>
    <p>Welcome to ${businessName}! Please verify your email address to activate your account:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 24 hours.</p>
  `;
  return dispatch(user.email, `Verify your email – ${businessName}`, html, link);
}

export async function sendPasswordResetEmail(user, rawToken) {
  const link = `${CLIENT_ORIGIN}/reset-password?token=${rawToken}`;
  const businessName = getSettings()?.businessName || "Kids Play Area";
  const html = `
    <p>Hi ${user.name},</p>
    <p>We received a request to reset your password for ${businessName}.</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  `;
  return dispatch(user.email, `Reset your password – ${businessName}`, html, link);
}
