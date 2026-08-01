import { useState } from "react";
import { Loader2, LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
import AuthLayout from "./AuthLayout.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { resendVerification } from "../../api.js";

const inputClass =
  "w-full rounded-2xl border-2 border-ink/10 glass-input pl-10 pr-3 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-fern";

export default function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setSubmitting(true);
    try {
      await login(email.trim(), password, rememberMe);
      // App-level routing takes over from here (redirects to the role's home tab).
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.error || "Could not log in. Check your connection and try again.");
      if (data?.requiresVerification) setNeedsVerification(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification(email.trim());
      setResent(true);
    } catch {
      // Endpoint always returns a generic success message; nothing to do here.
    }
  };

  return (
    <AuthLayout
      title="Staff Login"
      subtitle="Sign in to open today's booking desk."
      footer={
        <span className="text-ink/60 font-bold">
          New here?{" "}
          <button type="button" onClick={() => onNavigate("signup")} className="text-fern hover:underline">
            Create an account
          </button>
        </span>
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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Password</span>
            <button
              type="button"
              onClick={() => onNavigate("forgot")}
              className="text-[11px] font-extrabold text-fern hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="flex items-center gap-2 -mt-1">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded accent-fern"
          />
          <span className="text-xs font-bold text-ink/60">Remember me on this device</span>
        </label>

        {error && (
          <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm flex flex-col gap-2">
            <span>{error}</span>
            {needsVerification && (
              <button
                type="button"
                onClick={handleResend}
                className="text-xs font-extrabold uppercase tracking-wide text-lava underline w-fit"
              >
                {resent ? "Verification email sent ✓" : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="jelly-btn flex items-center justify-center gap-2 rounded-2xl bg-fern text-cream font-display text-base tracking-wide py-3 shadow-pop disabled:opacity-60"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
          Log In
        </button>
      </form>
    </AuthLayout>
  );
}
