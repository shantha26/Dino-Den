import { useState } from "react";
import { Loader2, UserPlus, Mail, Lock, User, ShieldCheck } from "lucide-react";
import AuthLayout from "./AuthLayout.jsx";
import PasswordStrengthMeter, { scorePassword } from "./PasswordStrengthMeter.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const inputClass =
  "w-full rounded-2xl border-2 border-ink/10 glass-input pl-10 pr-3 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-fern";

export default function SignupPage({ onNavigate }) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const mismatch = confirm.length > 0 && confirm !== password;
  const tooWeak = password.length > 0 && scorePassword(password) < 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      // On success this logs the person in and AuthGate swaps to <App/>
      // automatically — no further navigation needed here.
      await signup(name.trim(), email.trim(), password, role);
    } catch (err) {
      const serverError = err?.response?.data?.error || err?.response?.data?.message;
      setError(serverError || err?.message || "Could not create the account. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Select Admin or Staff role to set up your account."
      footer={
        <span className="text-ink/60 font-bold">
          Already have an account?{" "}
          <button type="button" onClick={() => onNavigate("login")} className="text-fern hover:underline">
            Log in
          </button>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Account Role</span>
          <div className="relative">
            <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Full Name</span>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Jane Doe"
            />
          </div>
        </label>

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

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Password</span>
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
          <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Confirm Password</span>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="Re-type password"
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
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
          Create Account
        </button>
      </form>
    </AuthLayout>
  );
}
