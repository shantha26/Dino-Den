import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, KeyRound, Users, UserPlus, Trash2, Loader2, CheckCircle2, History, RefreshCw,
} from "lucide-react";
import PasswordStrengthMeter, { scorePassword } from "../auth/PasswordStrengthMeter.jsx";
import {
  updateAdminSecurity, fetchUsers, createStaffUser, updateUserRole, deleteStaffUser, fetchActivityLogs,
} from "../../api.js";
import { useAuth } from "../../context/AuthContext.jsx";

const inputClass =
  "rounded-xl border-2 border-ink/10 px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-fern bg-white w-full";

const ROLE_LABEL = { admin: "Admin", manager: "Manager", cashier: "Cashier" };

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-fern/5 rounded-blob p-5 md:p-6 border-2 border-fern/15"
    >
      <div className="mb-4">
        <h2 className="font-display text-xl text-fern flex items-center gap-2">
          <Icon size={20} /> {title}
        </h2>
        {subtitle && <p className="text-xs font-bold text-ink/40 mt-1">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function AdminSecurityPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== newPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await updateAdminSecurity(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update the security password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Current Security Password</span>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">New Security Password</span>
        <input
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
        <PasswordStrengthMeter password={newPassword} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">Confirm New Password</span>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        {mismatch && <p className="text-[11px] font-extrabold text-lava">Passwords don't match.</p>}
      </label>

      {error && <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={saving || mismatch || scorePassword(newPassword) < 1}
        className="w-fit flex items-center gap-2 rounded-2xl bg-fern text-cream font-display text-sm tracking-wide px-5 py-2.5 shadow-pop disabled:opacity-60"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : success ? <CheckCircle2 size={16} /> : <KeyRound size={16} />}
        {success ? "Updated!" : "Update Security Password"}
      </button>
    </form>
  );
}

function StaffManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchUsers();
      setUsers(data);
    } catch {
      setError("Could not load staff accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      await createStaffUser(form);
      setForm({ name: "", email: "", password: "", role: "admin" });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Could not create the account.");
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await updateUserRole(id, role);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update role.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this staff account? This can't be undone.")) return;
    try {
      await deleteStaffUser(id);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not remove that account.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-bold text-ink/40">
          Admin/manager-created accounts are verified instantly — no email required.
        </p>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide bg-fern text-cream rounded-xl px-3 py-2"
        >
          <UserPlus size={14} /> {showForm ? "Cancel" : "Add Staff"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/60 rounded-2xl p-4 border-2 border-ink/10">
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
          <input required type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputClass} />
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inputClass}>
            <option value="admin">Admin</option>
          </select>
          {formError && <p className="sm:col-span-2 text-lava font-bold text-xs">{formError}</p>}
          <button type="submit" disabled={creating} className="sm:col-span-2 w-fit flex items-center gap-2 rounded-xl bg-fern text-cream font-display text-sm px-4 py-2 shadow-pop disabled:opacity-60">
            {creating ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />} Create Account
          </button>
        </form>
      )}

      {error && <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <Loader2 className="animate-spin text-fern" size={22} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-extrabold text-ink/40 uppercase tracking-wide">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Verified</th>
                <th className="py-2 pr-3">Last Login</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-ink/10">
                  <td className="py-2 pr-3 font-bold text-ink">{u.name}{u.id === currentUser?.id ? " (you)" : ""}</td>
                  <td className="py-2 pr-3 text-ink/60">{u.email}</td>
                  <td className="py-2 pr-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-lg border-2 border-ink/10 px-2 py-1 text-xs font-bold bg-white"
                    >
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">{u.isVerified ? "✅" : "—"}</td>
                  <td className="py-2 pr-3 text-ink/50 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td className="py-2 pr-3">
                    <button type="button" onClick={() => handleDelete(u.id)} className="text-lava hover:text-lava/70">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActivityLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchActivityLogs(150);
      setLogs(data);
    } catch {
      setError("Could not load the activity log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink/40">Most recent 150 events, across logins and settings changes.</p>
        <button type="button" onClick={load} className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-fern hover:text-swamp">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <Loader2 className="animate-spin text-fern" size={22} />
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border-2 border-ink/10">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-cream">
              <tr className="text-left font-extrabold text-ink/40 uppercase tracking-wide">
                <th className="py-2 px-3">When</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Details</th>
                <th className="py-2 px-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-ink/10">
                  <td className="py-2 px-3 whitespace-nowrap text-ink/50">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-2 px-3 text-ink font-bold">{log.userEmail || "—"}</td>
                  <td className="py-2 px-3 text-ink/70">{log.action.replace(/_/g, " ")}</td>
                  <td className="py-2 px-3 text-ink/50">{log.details}</td>
                  <td className="py-2 px-3">{log.success ? "✅" : "❌"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="py-4 px-3 text-center text-ink/40">No activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SecuritySettings() {
  return (
    <div className="flex flex-col gap-6">
      <Section icon={KeyRound} title="Admin Security Password" subtitle="Required, in addition to your login, every time Settings is opened.">
        <AdminSecurityPasswordForm />
      </Section>

      <Section icon={Users} title="Staff Accounts" subtitle="Create, promote, demote, or remove staff logins.">
        <StaffManagement />
      </Section>

      <Section icon={History} title="Activity Log" subtitle="Every login and settings change is recorded here for audit.">
        <ActivityLogViewer />
      </Section>
    </div>
  );
}
