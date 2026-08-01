import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, MessageSquare, Mail, Eye, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Save, Loader2, CheckCircle2,
  RotateCcw, Send, Smartphone, Settings2, AlertCircle, X,
  Cake, Gift, Star, ThumbsUp, Megaphone, CreditCard, ClipboardCheck,
} from "lucide-react";
import {
  fetchNotificationConfig,
  updateNotificationConfig,
  previewNotification,
  sendTestNotification,
  resetNotificationTemplates,
} from "../api.js";

// ── Event metadata ────────────────────────────────────────────────────────────
const EVENT_META = {
  bookingConfirmation: {
    label: "Booking Confirmation",
    icon: ClipboardCheck,
    color: "fern",
    description: "Sent instantly when a new booking is created.",
    trigger: "On new booking saved",
  },
  paymentReceipt: {
    label: "Payment Receipt",
    icon: CreditCard,
    color: "swamp",
    description: "Sent immediately after payment is collected.",
    trigger: "On booking saved (with billing)",
  },
  birthdayWish: {
    label: "Birthday Wishes",
    icon: Cake,
    color: "lava",
    description: "Sent on the child's birthday. Use 'Send Wishes Now' to trigger manually.",
    trigger: "Manual / Daily scheduler",
  },
  upcomingOffer: {
    label: "Upcoming Offer Alert",
    icon: Gift,
    color: "amber",
    description: "Notify customers about active promo offers.",
    trigger: "Manual trigger",
  },
  membershipReminder: {
    label: "Membership Milestone",
    icon: Star,
    color: "fern",
    description: "Sent when a customer reaches a loyalty milestone (2, 5, 10, 20 visits).",
    trigger: "On visit milestone",
  },
  feedbackRequest: {
    label: "Feedback Request",
    icon: ThumbsUp,
    color: "swamp",
    description: "Ask for feedback after a visit.",
    trigger: "Manual trigger",
  },
  reviewRequest: {
    label: "Review Request",
    icon: Star,
    color: "amber",
    description: "Request a public review from happy customers.",
    trigger: "Manual trigger",
  },
  promotionalMessage: {
    label: "Promotional Message",
    icon: Megaphone,
    color: "lava",
    description: "Broadcast a custom promotional message.",
    trigger: "Manual trigger",
  },
};

// Template variables reference
const TEMPLATE_VARS = [
  { var: "{{businessName}}", desc: "Business name" },
  { var: "{{parentName}}", desc: "Parent's name" },
  { var: "{{kidName}}", desc: "Child's name" },
  { var: "{{mobileNumber}}", desc: "Mobile number" },
  { var: "{{date}}", desc: "Visit date" },
  { var: "{{timeIn}}", desc: "Check-in time" },
  { var: "{{paymentMethod}}", desc: "Payment method" },
  { var: "{{cashAmount}}", desc: "Cash amount paid (₹)" },
  { var: "{{gpayAmount}}", desc: "GPay amount paid (₹)" },
  { var: "{{grandTotal}}", desc: "Grand total (₹)" },
  { var: "{{subtotal}}", desc: "Subtotal (₹)" },
  { var: "{{gstAmount}}", desc: "GST amount (₹)" },
  { var: "{{totalVisits}}", desc: "Total visits" },
  { var: "{{loyaltyPoints}}", desc: "Loyalty points" },
  { var: "{{membershipTier}}", desc: "Membership tier" },
  { var: "{{offerTitle}}", desc: "Offer title" },
  { var: "{{offerDescription}}", desc: "Offer description" },
  { var: "{{offerExpiry}}", desc: "Offer expiry date" },
  { var: "{{promoMessage}}", desc: "Custom promo text" },
];

const inputClass =
  "rounded-xl border-2 border-ink/10 px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-fern bg-white w-full";
const selectClass =
  "rounded-xl border-2 border-ink/10 px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-fern bg-white w-full appearance-none cursor-pointer";

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 text-sm font-extrabold transition-colors ${checked ? "text-fern" : "text-ink/40"}`}
    >
      {checked
        ? <ToggleRight size={22} className="text-fern" />
        : <ToggleLeft size={22} className="text-ink/30" />}
      {label}
    </button>
  );
}

// ── Channel badge ─────────────────────────────────────────────────────────────
function ChannelBadge({ icon: Icon, label, enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-2.5 py-1.5 rounded-lg border-2 transition-all ${
        enabled
          ? "bg-fern/10 border-fern/30 text-fern"
          : "bg-ink/5 border-ink/10 text-ink/30"
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

// ── Template editor for a single event ───────────────────────────────────────
function TemplateEditor({ eventKey, template, onChange }) {
  const meta = EVENT_META[eventKey] || { label: eventKey, icon: Bell, color: "fern" };
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewErr, setPreviewErr] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [testMobile, setTestMobile] = useState("");
  const [showTestInput, setShowTestInput] = useState(false);

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewErr("");
    setPreviewData(null);
    try {
      const { data } = await previewNotification({ subject: template.subject, body: template.body });
      setPreviewData(data);
    } catch {
      setPreviewErr("Preview failed — check that the backend is running.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSendTest = async () => {
    if (!testMobile.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const { data } = await sendTestNotification({
        eventKey,
        extraContext: { mobileNumber: testMobile, parentName: "Test Parent", kidName: "Test Kid" },
      });
      setSendResult({ ok: true, msg: "Test notification dispatched (check server logs)." });
    } catch {
      setSendResult({ ok: false, msg: "Send failed — check backend and credentials." });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 4000);
    }
  };

  const insertVar = (v) => {
    onChange({ ...template, body: template.body + v });
  };

  return (
    <div className={`rounded-2xl border-2 transition-all ${template.enabled ? `border-${meta.color}/20 bg-${meta.color}/5` : "border-ink/10 bg-ink/5"}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${template.enabled ? `bg-${meta.color}/15 text-${meta.color}` : "bg-ink/10 text-ink/30"}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-extrabold text-sm ${template.enabled ? "text-ink" : "text-ink/40"}`}>
              {meta.label}
            </span>
            <span className="text-[10px] font-bold text-ink/30 bg-ink/5 rounded-md px-1.5 py-0.5 border border-ink/10">
              {meta.trigger}
            </span>
          </div>
          <p className="text-xs text-ink/40 font-bold mt-0.5 truncate">{meta.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Toggle
            checked={template.enabled}
            onChange={(v) => onChange({ ...template, enabled: v })}
            label={template.enabled ? "On" : "Off"}
          />
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-ink/30 hover:text-fern transition-colors p-1"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-4 border-t-2 border-ink/10 pt-4">
              {/* Channels */}
              <div>
                <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-2">
                  Send Via
                </span>
                <div className="flex gap-2 flex-wrap">
                  <ChannelBadge
                    icon={Smartphone}
                    label="WhatsApp / SMS"
                    enabled={template.channels?.whatsapp ?? false}
                    onChange={(v) => onChange({ ...template, channels: { ...template.channels, whatsapp: v } })}
                  />
                  <ChannelBadge
                    icon={Mail}
                    label="Email"
                    enabled={template.channels?.email ?? false}
                    onChange={(v) => onChange({ ...template, channels: { ...template.channels, email: v } })}
                  />
                </div>
              </div>

              {/* Subject (email) */}
              <div>
                <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1.5">
                  Email Subject
                </span>
                <input
                  type="text"
                  className={inputClass}
                  value={template.subject || ""}
                  onChange={(e) => onChange({ ...template, subject: e.target.value })}
                  placeholder="Email subject line…"
                />
              </div>

              {/* Body */}
              <div>
                <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1.5">
                  Message Body
                </span>
                <textarea
                  rows={4}
                  className={`${inputClass} resize-none`}
                  value={template.body || ""}
                  onChange={(e) => onChange({ ...template, body: e.target.value })}
                  placeholder="Write your message here…"
                />
              </div>

              {/* Variable chips */}
              <div>
                <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1.5">
                  Insert Variable
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map(({ var: v, desc }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      title={desc}
                      className="text-[10px] font-extrabold bg-fern/10 text-fern border border-fern/20 rounded-md px-1.5 py-0.5 hover:bg-fern/20 transition-colors font-mono"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl border-2 border-ink/15 text-ink/60 hover:border-fern/30 hover:text-fern transition-all"
                >
                  {previewing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setShowTestInput((s) => !s)}
                  className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl border-2 border-ink/15 text-ink/60 hover:border-amber/30 hover:text-amber transition-all"
                >
                  <Send size={12} />
                  Send Test
                </button>
              </div>

              {/* Test send input */}
              <AnimatePresence>
                {showTestInput && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="tel"
                      maxLength={10}
                      className={`${inputClass} flex-1`}
                      value={testMobile}
                      onChange={(e) => setTestMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 10-digit mobile for test"
                    />
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={sending || testMobile.length !== 10}
                      className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl bg-amber/15 text-amber border-2 border-amber/20 hover:bg-amber/25 transition-all disabled:opacity-40"
                    >
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Send
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Test result */}
              {sendResult && (
                <div className={`text-xs font-bold px-3 py-2 rounded-xl border-2 flex items-center gap-2 ${sendResult.ok ? "bg-fern/10 border-fern/20 text-fern" : "bg-lava/10 border-lava/20 text-lava"}`}>
                  {sendResult.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {sendResult.msg}
                </div>
              )}

              {/* Preview panel */}
              <AnimatePresence>
                {previewData && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="bg-white rounded-2xl border-2 border-fern/20 p-4 relative"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="absolute top-2.5 right-2.5 text-ink/30 hover:text-lava transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-[10px] font-extrabold text-fern uppercase tracking-widest mb-2">Preview</p>
                    {previewData.renderedSubject && (
                      <p className="text-xs font-extrabold text-ink mb-1">
                        Subject: {previewData.renderedSubject}
                      </p>
                    )}
                    <p className="text-sm font-bold text-ink/80 whitespace-pre-wrap leading-relaxed">
                      {previewData.renderedBody}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {previewErr && (
                <p className="text-xs font-bold text-lava">{previewErr}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Provider credentials section ──────────────────────────────────────────────
function CredentialsSection({ whatsapp, email, onChange }) {
  const [showWA, setShowWA] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* WhatsApp */}
      <div className="rounded-2xl border-2 border-ink/10 bg-white overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-fern/5 transition-colors"
          onClick={() => setShowWA((s) => !s)}
        >
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-fern" />
            <span className="font-extrabold text-sm text-ink">WhatsApp / SMS Provider</span>
            {whatsapp.configured
              ? <span className="text-[10px] bg-fern/10 text-fern border border-fern/20 rounded-md px-1.5 py-0.5 font-extrabold">Configured</span>
              : <span className="text-[10px] bg-ink/10 text-ink/40 border border-ink/10 rounded-md px-1.5 py-0.5 font-extrabold">Not configured</span>}
          </div>
          {showWA ? <ChevronUp size={14} className="text-ink/40" /> : <ChevronDown size={14} className="text-ink/40" />}
        </button>
        <AnimatePresence>
          {showWA && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden border-t-2 border-ink/10"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">Provider</label>
                  <select
                    className={selectClass}
                    value={whatsapp.provider}
                    onChange={(e) => onChange("whatsapp", "provider", e.target.value)}
                  >
                    <option value="none">None (disabled)</option>
                    <option value="twilio">Twilio</option>
                    <option value="wati">WATI</option>
                    <option value="gupshup">Gupshup</option>
                  </select>
                </div>
                {whatsapp.provider !== "none" && (
                  <>
                    <div>
                      <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">API Key / Account SID</label>
                      <input type="text" className={inputClass} value={whatsapp.apiKey} placeholder="sk-••••••••" onChange={(e) => onChange("whatsapp", "apiKey", e.target.value)} />
                    </div>
                    {whatsapp.provider === "twilio" && (
                      <div>
                        <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">Auth Token / Secret</label>
                        <input type="password" className={inputClass} value={whatsapp.apiSecret} placeholder="Auth token" onChange={(e) => onChange("whatsapp", "apiSecret", e.target.value)} />
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">From Number (WhatsApp Sender)</label>
                      <input type="text" className={inputClass} value={whatsapp.fromNumber} placeholder="+91XXXXXXXXXX" onChange={(e) => onChange("whatsapp", "fromNumber", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Email */}
      <div className="rounded-2xl border-2 border-ink/10 bg-white overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-fern/5 transition-colors"
          onClick={() => setShowEmail((s) => !s)}
        >
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-amber" />
            <span className="font-extrabold text-sm text-ink">Email Provider</span>
            {email.configured
              ? <span className="text-[10px] bg-fern/10 text-fern border border-fern/20 rounded-md px-1.5 py-0.5 font-extrabold">Configured</span>
              : <span className="text-[10px] bg-ink/10 text-ink/40 border border-ink/10 rounded-md px-1.5 py-0.5 font-extrabold">Not configured</span>}
          </div>
          {showEmail ? <ChevronUp size={14} className="text-ink/40" /> : <ChevronDown size={14} className="text-ink/40" />}
        </button>
        <AnimatePresence>
          {showEmail && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden border-t-2 border-ink/10"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">Provider</label>
                  <select className={selectClass} value={email.provider} onChange={(e) => onChange("email", "provider", e.target.value)}>
                    <option value="none">None (disabled)</option>
                    <option value="smtp">SMTP</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="mailgun">Mailgun</option>
                  </select>
                </div>
                {email.provider !== "none" && (
                  <>
                    <div>
                      <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">From Email</label>
                      <input type="email" className={inputClass} value={email.fromEmail} placeholder="hello@kidsplayarea.com" onChange={(e) => onChange("email", "fromEmail", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">From Name</label>
                      <input type="text" className={inputClass} value={email.fromName} placeholder="Kids Play Area" onChange={(e) => onChange("email", "fromName", e.target.value)} />
                    </div>
                    {(email.provider === "sendgrid" || email.provider === "mailgun") && (
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">API Key</label>
                        <input type="password" className={inputClass} value={email.apiKey} placeholder="API key" onChange={(e) => onChange("email", "apiKey", e.target.value)} />
                      </div>
                    )}
                    {email.provider === "smtp" && (
                      <>
                        <div>
                          <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">SMTP Host</label>
                          <input type="text" className={inputClass} value={email.smtpHost} placeholder="smtp.gmail.com" onChange={(e) => onChange("email", "smtpHost", e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">SMTP Port</label>
                          <input type="number" className={inputClass} value={email.smtpPort} onChange={(e) => onChange("email", "smtpPort", e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">SMTP User</label>
                          <input type="text" className={inputClass} value={email.smtpUser} placeholder="your@email.com" onChange={(e) => onChange("email", "smtpUser", e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest block mb-1">SMTP Password</label>
                          <input type="password" className={inputClass} value={email.smtpPass} placeholder="App password" onChange={(e) => onChange("email", "smtpPass", e.target.value)} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main NotificationsSettings component ──────────────────────────────────────
export default function NotificationsSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const { data } = await fetchNotificationConfig();
      setConfig(data);
    } catch {
      setLoadErr("Could not load notification settings — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateTemplate = (key, updated) => {
    setConfig((c) => ({ ...c, templates: { ...c.templates, [key]: updated } }));
  };

  const updateCreds = (channel, field, value) => {
    setConfig((c) => ({ ...c, [channel]: { ...c[channel], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveErr("");
    setSaved(false);
    try {
      await updateNotificationConfig({
        whatsapp: config.whatsapp,
        email: config.email,
        templates: config.templates,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveErr(err?.response?.data?.error || "Could not save notification settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetTemplates = async () => {
    if (!window.confirm("Reset all message templates to factory defaults? Your custom messages will be lost.")) return;
    setResetting(true);
    try {
      const { data } = await resetNotificationTemplates();
      setConfig((c) => ({ ...c, templates: data.templates }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveErr("Could not reset templates.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-ink/40 font-bold gap-2">
        <Loader2 className="animate-spin" size={16} /> Loading notification settings…
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
        <AlertCircle size={15} /> {loadErr}
      </div>
    );
  }

  const templates = config?.templates || {};

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl text-fern flex items-center gap-2">
            <Bell size={18} /> Automated Notifications
          </h2>
          <p className="text-xs font-bold text-ink/40 mt-0.5">
            Configure channels, customize message templates, and control which events trigger notifications.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetTemplates}
          disabled={resetting}
          className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink/40 hover:text-lava transition-colors disabled:opacity-40"
        >
          {resetting ? <Loader2 className="animate-spin" size={12} /> : <RotateCcw size={12} />}
          Reset Templates
        </button>
      </div>

      {/* Channel credentials */}
      <div className="bg-ink/5 rounded-blob p-4 border-2 border-ink/10">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 size={16} className="text-ink/50" />
          <h3 className="font-extrabold text-sm text-ink/70 uppercase tracking-wide">Provider Credentials</h3>
        </div>
        <CredentialsSection
          whatsapp={config?.whatsapp || {}}
          email={config?.email || {}}
          onChange={updateCreds}
        />
      </div>

      {/* Templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-ink/50" />
          <h3 className="font-extrabold text-sm text-ink/70 uppercase tracking-wide">Message Templates</h3>
        </div>
        <div className="flex flex-col gap-3">
          {Object.keys(EVENT_META).map((key) => (
            <TemplateEditor
              key={key}
              eventKey={key}
              template={templates[key] || { enabled: false, channels: { whatsapp: false, email: false }, subject: "", body: "" }}
              onChange={(updated) => updateTemplate(key, updated)}
            />
          ))}
        </div>
      </div>

      {saveErr && (
        <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {saveErr}
        </div>
      )}

      {/* Sticky save */}
      <div className="sticky bottom-4 flex justify-end">
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.97 }}
          className="jelly-btn flex items-center gap-2 bg-lava text-white font-display text-lg tracking-wide px-6 py-3.5 rounded-2xl shadow-pop active:shadow-none disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="animate-spin" size={18} /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={18} /> Saved</>
          ) : (
            <><Save size={18} /> Save Notifications</>
          )}
        </motion.button>
      </div>
    </div>
  );
}
