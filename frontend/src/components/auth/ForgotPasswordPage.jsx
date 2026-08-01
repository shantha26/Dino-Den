import { useState } from "react";
import { Loader2, Mail, Send, CheckCircle2 } from "lucide-react";
import AuthLayout from "./AuthLayout.jsx";
import { forgotPassword } from "../../api.js";

const inputClass =
  "w-full rounded-2xl border-2 border-ink/10 glass-input pl-10 pr-3 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-fern";

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check Your Email" subtitle="">
        <div className="flex flex-col items-center gap-3 text-center py-4">
          <CheckCircle2 className="text-fern" size={40} />
          <p className="font-bold text-ink/70">
            If an account exists for <span className="text-ink">{email}</span>, a reset link is on its way.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="mt-2 rounded-2xl bg-fern text-cream font-display text-sm tracking-wide px-6 py-2.5 shadow-pop"
          >
            Back to Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="We'll email you a link to reset it."
      footer={
        <button type="button" onClick={() => onNavigate("login")} className="text-fern hover:underline font-bold">
          Back to Login
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Email</span>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
        </label>

        {error && (
          <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="jelly-btn flex items-center justify-center gap-2 rounded-2xl bg-fern text-cream font-display text-base tracking-wide py-3 shadow-pop disabled:opacity-60"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          Send Reset Link
        </button>
      </form>
    </AuthLayout>
  );
}
