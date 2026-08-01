import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon, Image, Percent, Users, Plus, Trash2,
  Loader2, CheckCircle2, RotateCcw, Save, Upload, X, Bell, ShieldCheck,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import NotificationsSettings from "./NotificationsSettings.jsx";
import SecuritySettings from "./settings/SecuritySettings.jsx";

function slugify(label) {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `package_${Date.now()}`
  );
}

function Section({ icon: Icon, title, subtitle, children, accent = "fern" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-${accent}/5 rounded-blob p-5 md:p-6 border-2 border-${accent}/15`}
    >
      <div className="mb-4">
        <h2 className={`font-display text-xl text-${accent} flex items-center gap-2`}>
          <Icon size={20} /> {title}
        </h2>
        {subtitle && <p className="text-xs font-bold text-ink/40 mt-1">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-extrabold text-ink/50 uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-xl border-2 border-ink/10 px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-fern bg-white w-full";

export default function SettingsPage() {
  const { settings, loading, loaded, error, save, reset } = useSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const fileInputRef = useRef(null);

  // Sync local editable copy whenever the context's settings change (initial
  // load, after a save, or after a reset) — but not on every render.
  useEffect(() => {
    if (loaded) setForm(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settings]);

  const updateField = (path, value) => {
    setForm((f) => {
      const next = structuredClone(f);
      let cursor = next;
      for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]];
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setSaveError("Logo image is too large — please use a file under ~1.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const addSoftPlayPackage = () => {
    setForm((f) => ({
      ...f,
      softPlayPricing: [...f.softPlayPricing, { key: `package_${Date.now()}`, label: "New Package", price: 0, emoji: "🎟️" }],
    }));
  };
  const removeSoftPlayPackage = (idx) => {
    setForm((f) => ({ ...f, softPlayPricing: f.softPlayPricing.filter((_, i) => i !== idx) }));
  };
  const updateSoftPlayPackage = (idx, field, value) => {
    setForm((f) => {
      const list = [...f.softPlayPricing];
      const pkg = { ...list[idx], [field]: value };
      if (field === "label") pkg.key = list[idx].key || slugify(value);
      list[idx] = pkg;
      return { ...f, softPlayPricing: list };
    });
  };

  const addMembershipPlan = () => {
    setForm((f) => ({ ...f, membershipPlans: [...f.membershipPlans, { name: "New Tier", minVisits: 0 }] }));
  };
  const removeMembershipPlan = (idx) => {
    setForm((f) => ({ ...f, membershipPlans: f.membershipPlans.filter((_, i) => i !== idx) }));
  };
  const updateMembershipPlan = (idx, field, value) => {
    setForm((f) => {
      const list = [...f.membershipPlans];
      list[idx] = { ...list[idx], [field]: value };
      return { ...f, membershipPlans: list };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const payload = {
        ...form,
        gstPercentage: Number(form.gstPercentage) || 0,
        maxCapacity: Number(form.maxCapacity) || 1,
        avgSessionMinutes: Number(form.avgSessionMinutes) || 1,
        softPlayPricing: form.softPlayPricing.map((p) => ({ ...p, price: Number(p.price) || 0, key: p.key || slugify(p.label) })),
        arcadePricing: { coinPrice: Number(form.arcadePricing.coinPrice) || 0 },
        basketballPricing: { price: Number(form.basketballPricing.price) || 0 },
        gamingPricing: {
          ps3: { label: form.gamingPricing.ps3.label, pricePerHour: Number(form.gamingPricing.ps3.pricePerHour) || 0 },
          ps5: { label: form.gamingPricing.ps5.label, pricePerHour: Number(form.gamingPricing.ps5.pricePerHour) || 0 },
        },
        socksPricing: {
          kid: { label: form.socksPricing.kid.label, price: Number(form.socksPricing.kid.price) || 0 },
          adult: { label: form.socksPricing.adult.label, price: Number(form.socksPricing.adult.price) || 0 },
        },
        membershipPlans: form.membershipPlans.map((p) => ({ name: p.name, minVisits: Number(p.minVisits) || 0 })),
      };
      await save(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err?.response?.data?.error || "Could not save settings — check that the backend server is running.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all settings to factory defaults? This can't be undone.")) return;
    setResetting(true);
    setSaveError("");
    try {
      await reset();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Could not reset settings — check that the backend server is running.");
    } finally {
      setResetting(false);
    }
  };

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-20 text-ink/40 font-bold gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading settings…
      </div>
    );
  }

  if (error && !loaded) {
    return (
      <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-5 py-4">{error}</div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-fern flex items-center gap-2">
            <SettingsIcon size={22} /> Settings
          </h1>
          <p className="text-xs font-bold text-ink/40 mt-1">
            Changes here apply immediately across booking, billing, and reporting.
          </p>
        </div>
        {activeSettingsTab === "general" && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink/40 hover:text-lava transition-colors disabled:opacity-40"
          >
            {resetting ? <Loader2 className="animate-spin" size={13} /> : <RotateCcw size={13} />}
            Reset to defaults
          </button>
        )}
      </div>

      {/* Settings tab switcher */}
      <div className="flex gap-2 bg-ink/5 rounded-2xl p-1.5 border-2 border-ink/10 w-fit">
        {[
          { key: "general", label: "General", icon: SettingsIcon },
          { key: "notifications", label: "Notifications", icon: Bell },
          { key: "security", label: "Security", icon: ShieldCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSettingsTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-extrabold uppercase tracking-wide transition-all ${
              activeSettingsTab === key
                ? "bg-white shadow-popsm text-fern border-2 border-fern/20"
                : "text-ink/50 hover:text-ink border-2 border-transparent"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeSettingsTab === "notifications" && (
        <NotificationsSettings />
      )}

      {activeSettingsTab === "security" && (
        <SecuritySettings />
      )}

      {activeSettingsTab === "general" && (<>

      <Section icon={Image} title="Business Identity" subtitle="Shown in the header and on printed/exported reports.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name">
            <input
              type="text"
              className={inputClass}
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            />
          </Field>
          <Field label="Logo">
            <div className="flex items-center gap-3">
              {form.logo ? (
                <div className="relative shrink-0">
                  <img src={form.logo} alt="Logo preview" className="w-12 h-12 rounded-xl object-cover border-2 border-ink/10" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, logo: "" }))}
                    className="absolute -top-2 -right-2 bg-lava text-white rounded-full p-0.5 shadow-popsm"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <div className="relative shrink-0">
                  <img
                    src="/dino-den-logo.png"
                    alt="Default Dino Den logo"
                    className="w-12 h-12 rounded-full object-cover border-2 border-ink/10"
                  />
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-extrabold uppercase tracking-wide text-ink/35">
                    default
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="jelly-btn flex items-center gap-1.5 bg-fern/10 text-fern text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl border-2 border-fern/20"
              >
                <Upload size={13} /> Upload
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
          </Field>
        </div>
      </Section>

      <Section icon={Percent} title="Tax & Capacity" accent="swamp">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="GST Percentage">
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={form.gstPercentage}
                onChange={(e) => setForm((f) => ({ ...f, gstPercentage: e.target.value }))}
              />
            </div>
          </Field>
          <Field label="Maximum Capacity">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.maxCapacity}
              onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))}
            />
          </Field>
          <Field label="Avg. Session Length (min)">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.avgSessionMinutes}
              onChange={(e) => setForm((f) => ({ ...f, avgSessionMinutes: e.target.value }))}
            />
          </Field>
        </div>
      </Section>

      <Section icon={SettingsIcon} title="Soft Play Pricing" subtitle="Editable label, price, and icon for each package.">
        <div className="flex flex-col gap-3">
          {form.softPlayPricing.map((pkg, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white rounded-xl border-2 border-ink/10 p-3">
              <input
                type="text"
                value={pkg.emoji}
                onChange={(e) => updateSoftPlayPackage(idx, "emoji", e.target.value)}
                className="w-10 text-center text-lg rounded-lg border-2 border-ink/10 py-1.5 shrink-0"
              />
              <input
                type="text"
                value={pkg.label}
                onChange={(e) => updateSoftPlayPackage(idx, "label", e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="Package name"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-bold text-ink/40">₹</span>
                <input
                  type="number"
                  min={0}
                  value={pkg.price}
                  onChange={(e) => updateSoftPlayPackage(idx, "price", e.target.value)}
                  className="w-24 rounded-lg border-2 border-ink/10 px-2 py-1.5 text-sm font-bold text-ink"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSoftPlayPackage(idx)}
                className="shrink-0 text-ink/30 hover:text-lava transition-colors p-1.5"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSoftPlayPackage}
            className="jelly-btn self-start flex items-center gap-1.5 bg-fern/10 text-fern text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl border-2 border-fern/20"
          >
            <Plus size={14} /> Add Package
          </button>
        </div>
      </Section>

      <Section icon={SettingsIcon} title="Arcade & Basketball Pricing" accent="amber">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Arcade Coin Price">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-ink/40">₹</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.arcadePricing.coinPrice}
                onChange={(e) => updateField(["arcadePricing", "coinPrice"], e.target.value)}
              />
            </div>
          </Field>
          <Field label="Basketball Price">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-ink/40">₹</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.basketballPricing.price}
                onChange={(e) => updateField(["basketballPricing", "price"], e.target.value)}
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section icon={SettingsIcon} title="PS5 Pricing" subtitle="Also covers PS3, shown together under Gaming." accent="swamp">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {["ps3", "ps5"].map((consoleKey) => (
            <div key={consoleKey} className="bg-white rounded-xl border-2 border-ink/10 p-3 flex flex-col gap-2">
              <Field label={`${consoleKey.toUpperCase()} Label`}>
                <input
                  type="text"
                  className={inputClass}
                  value={form.gamingPricing[consoleKey].label}
                  onChange={(e) => updateField(["gamingPricing", consoleKey, "label"], e.target.value)}
                />
              </Field>
              <Field label="Price / Hour">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-ink/40">₹</span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.gamingPricing[consoleKey].pricePerHour}
                    onChange={(e) => updateField(["gamingPricing", consoleKey, "pricePerHour"], e.target.value)}
                  />
                </div>
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={SettingsIcon} title="Socks Pricing" accent="amber">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {["kid", "adult"].map((sizeKey) => (
            <div key={sizeKey} className="bg-white rounded-xl border-2 border-ink/10 p-3 flex flex-col gap-2">
              <Field label={`${sizeKey === "kid" ? "Kid" : "Adult"} Label`}>
                <input
                  type="text"
                  className={inputClass}
                  value={form.socksPricing[sizeKey].label}
                  onChange={(e) => updateField(["socksPricing", sizeKey, "label"], e.target.value)}
                />
              </Field>
              <Field label="Price">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-ink/40">₹</span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.socksPricing[sizeKey].price}
                    onChange={(e) => updateField(["socksPricing", sizeKey, "price"], e.target.value)}
                  />
                </div>
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Users} title="Membership Plans" subtitle="Visit-based loyalty tiers — a customer qualifies for the highest tier their lifetime visit count reaches.">
        <div className="flex flex-col gap-3">
          {form.membershipPlans.map((plan, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white rounded-xl border-2 border-ink/10 p-3">
              <input
                type="text"
                value={plan.name}
                onChange={(e) => updateMembershipPlan(idx, "name", e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="Tier name"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-ink/40 whitespace-nowrap">Min visits</span>
                <input
                  type="number"
                  min={0}
                  value={plan.minVisits}
                  onChange={(e) => updateMembershipPlan(idx, "minVisits", e.target.value)}
                  className="w-20 rounded-lg border-2 border-ink/10 px-2 py-1.5 text-sm font-bold text-ink"
                />
              </div>
              <button
                type="button"
                onClick={() => removeMembershipPlan(idx)}
                className="shrink-0 text-ink/30 hover:text-lava transition-colors p-1.5"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMembershipPlan}
            className="jelly-btn self-start flex items-center gap-1.5 bg-fern/10 text-fern text-xs font-extrabold uppercase tracking-wide px-3 py-2 rounded-xl border-2 border-fern/20"
          >
            <Plus size={14} /> Add Tier
          </button>
        </div>
      </Section>

      {saveError && (
        <div className="bg-lava/10 border-2 border-lava/30 text-lava font-bold rounded-2xl px-5 py-3 text-sm">
          {saveError}
        </div>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.97 }}
          className="jelly-btn flex items-center gap-2 bg-lava text-white font-display text-lg tracking-wide px-6 py-3.5 rounded-2xl shadow-pop active:shadow-none disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Saving…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={18} /> Saved
            </>
          ) : (
            <>
              <Save size={18} /> Save Settings
            </>
          )}
        </motion.button>
      </div>
      </>)}
    </div>
  );
}
