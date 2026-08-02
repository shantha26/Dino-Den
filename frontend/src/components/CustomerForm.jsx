import { motion, AnimatePresence } from "framer-motion";
import { PawPrint, Phone, Cake, Clock, LogOut, Plus, X } from "lucide-react";
import { calculateAge, formatDMY } from "../utils.js";
import { useSettings } from "../context/SettingsContext.jsx";

function Field({ label, icon: Icon, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs lg:text-sm font-extrabold text-ink/60 uppercase tracking-wide flex items-center gap-1.5">
        <Icon size={14} /> {label}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "rounded-2xl border-2 bg-white px-4 py-2.5 font-body font-semibold text-ink placeholder:text-ink/30 focus:outline-none transition-colors text-base lg:text-lg";

export default function CustomerForm({
  customer,
  setCustomer,
  order,
  setOrder,
  age,
  mobileError,
  onDateTouched,
  onTimeTouched,
}) {
  const update = (field) => (e) => setCustomer((c) => ({ ...c, [field]: e.target.value }));

  const updateMobile = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setCustomer((c) => ({ ...c, mobileNumber: digitsOnly }));
  };

  const additionalKids = customer.additionalKids || [];

  const addKid = () =>
    setCustomer((c) => ({
      ...c,
      additionalKids: [...(c.additionalKids || []), { kidName: "", dob: "" }],
    }));

  const removeKid = (idx) => {
    setCustomer((c) => ({
      ...c,
      additionalKids: (c.additionalKids || []).filter((_, i) => i !== idx),
    }));
  };

  const updateKid = (idx, field) => (e) =>
    setCustomer((c) => {
      const kids = [...(c.additionalKids || [])];
      kids[idx] = { ...kids[idx], [field]: e.target.value };
      return { ...c, additionalKids: kids };
    });

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-bone rounded-blob shadow-pop border-2 border-ink/10 p-6 md:p-8 relative overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <motion.span
            className="text-3xl"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            🦖
          </motion.span>
          <h1 className="font-display text-2xl md:text-3xl text-fern tracking-wide">
            Dino Play Zone — Check-In
          </h1>
        </div>

        {/* Current Date — read-only label beside the heading, no picker */}
        <span className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-ink/50 bg-ink/5 rounded-full px-3 py-1.5 shrink-0">
          📅 {formatDMY(customer.date)}
        </span>
      </div>
      <p className="text-ink/50 font-bold mb-6 ml-1">Roarrr! Let's get this little dino registered</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Kid Name" icon={PawPrint}>
          <input
            className={`${inputBase} border-ink/10 focus:border-fern`}
            placeholder="e.g. Aarav"
            value={customer.kidName}
            onChange={(e) => {
              // Parent Name isn't shown in this form anymore, but the
              // backend still requires it — keep it in sync with Kid Name
              // behind the scenes so saving continues to work unchanged.
              const value = e.target.value;
              setCustomer((c) => ({ ...c, kidName: value, parentName: value }));
            }}
          />
        </Field>

        <Field label="Mobile Number" icon={Phone}>
          <input
            className={`${inputBase} ${mobileError ? "border-lava focus:border-lava" : "border-ink/10 focus:border-fern"
              }`}
            placeholder="10-digit mobile"
            value={customer.mobileNumber}
            onChange={updateMobile}
            inputMode="numeric"
            maxLength={10}
          />
          {mobileError && <span className="text-xs font-bold text-lava">{mobileError}</span>}
        </Field>

        <Field label="Kid DOB" icon={Cake}>
          <input
            type="date"
            placeholder="dd-mm-yyyy"
            className={`${inputBase} border-ink/10 focus:border-fern`}
            value={customer.dob}
            onChange={update("dob")}
            max={new Date().toISOString().slice(0, 10)}
          />
          {age && (
            <span className="text-xs font-extrabold text-fern bg-fern/10 rounded-full px-2.5 py-1 w-fit mt-1">
              🎂 Age: {age}
            </span>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Field label="Time In" icon={Clock}>
          <input
            type="time"
            className={`${inputBase} border-ink/10 focus:border-fern`}
            value={customer.timeIn}
            onChange={(e) => {
              onTimeTouched();
              update("timeIn")(e);
            }}
          />
        </Field>
        <Field label="Time Out" icon={LogOut}>
          <input
            type="time"
            className={`${inputBase} border-ink/10 focus:border-fern`}
            value={customer.timeOut}
            onChange={update("timeOut")}
          />
        </Field>
      </div>

      {/* ── Additional kids on this booking ─────────────────────────────── */}
      <div className="mt-5 pt-5 border-t-2 border-ink/10">
        <span className="text-xs lg:text-sm font-extrabold text-ink/60 uppercase tracking-wide">
          Kids on this booking
        </span>

        <AnimatePresence initial={false}>
          {additionalKids.map((kid, idx) => {
            const kidAge = calculateAge(kid.dob);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="relative bg-white/60 rounded-2xl p-4 border-2 border-ink/10 mt-4"
              >
                {/* Small circular red ✕ delete button at top-right */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() => removeKid(idx)}
                  aria-label={`Remove kid ${idx + 2}`}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-lava text-white flex items-center justify-center hover:bg-lava/80 transition-colors shadow-sm z-10"
                >
                  <X size={14} />
                </motion.button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
                  <Field label={`Kid ${idx + 2} Name`} icon={PawPrint}>
                    <input
                      className={`${inputBase} border-ink/10 focus:border-fern`}
                      placeholder="e.g. Diya"
                      value={kid.kidName}
                      onChange={updateKid(idx, "kidName")}
                    />
                  </Field>

                  <Field label={`Kid ${idx + 2} DOB`} icon={Cake}>
                    <input
                      type="date"
                      className={`${inputBase} border-ink/10 focus:border-fern`}
                      value={kid.dob}
                      onChange={updateKid(idx, "dob")}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                    {kidAge && (
                      <span className="text-xs font-extrabold text-fern bg-fern/10 rounded-full px-2.5 py-1 w-fit mt-1">
                        🎂 Age: {kidAge}
                      </span>
                    )}
                  </Field>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={addKid}
          className="jelly-btn mt-4 flex items-center gap-2 bg-fern/10 border-2 border-fern/30 text-fern text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-fern/15 transition-colors"
        >
          <Plus size={16} /> Add Another Kid
        </motion.button>
      </div>
    </motion.section>
  );
}
