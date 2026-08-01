import { useState } from "react";
import { Loader2, Lock, CheckCircle2, KeyRound } from "lucide-react";
import AuthLayout from "./AuthLayout.jsx";
import PasswordStrengthMeter, { scorePassword } from "./PasswordStrengthMeter.jsx";
import { resetPassword } from "../../api.js";

const inputClass =
  "w-full rounded-2xl border-2 border-ink/10 glass-input pl-10 pr-3 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-fern";

export default function ResetPasswordPage({ token, onNavigate }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const tooWeak = password.length > 0 && scorePassword(password) < 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || "That reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Password Updated" subtitle="">
        <div className="flex flex-col items-center gap-3 text-center py-4">
          <CheckCircle2 className="text-fern" size={40} />
          <p className="font-bold text-ink/70">Your password has been updated. You can now log in.</p>
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="mt-2 rounded-2xl bg-fern text-cream font-display text-sm tracking-wide px-6 py-2.5 shadow-pop"
          >
            Go to Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">New Password</span>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>
          <PasswordStrengthMeter password={password} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Confirm New Password</span>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="Re-type new password"
            />
          </div>
          {mismatch && <p className="text-[11px] font-extrabold text-lava">Passwords don't match.</p>}
        </label>

        {error && (
          <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || mismatch || tooWeak}
          className="jelly-btn flex items-center justify-center gap-2 rounded-2xl bg-fern text-cream font-display text-base tracking-wide py-3 shadow-pop disabled:opacity-60"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
          Update Password
        </button>
      </form>
    </AuthLayout>
  );
}
