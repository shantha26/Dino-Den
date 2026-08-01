import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";

const ROLE_LABEL = { admin: "Admin", manager: "Manager", cashier: "Cashier" };
const ROLE_COLOR = {
  admin: "bg-lava/20 text-lava",
  manager: "bg-amber/20 text-amber",
  cashier: "bg-fern/20 text-cream",
};

export default function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  // Position the portal dropdown under the button
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-black/15 hover:bg-black/20 transition-colors rounded-2xl pl-2 pr-3 py-1.5 text-cream"
      >
        <UserCircle2 size={22} />
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-display">{user.name}</span>
          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded ${ROLE_COLOR[user.role] || ""}`}>
            {ROLE_LABEL[user.role] || user.role}
          </span>
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                top: dropdownPos.top,
                right: dropdownPos.right,
                zIndex: 9999,
                width: "224px",
              }}
              className="glass-card rounded-2xl shadow-pop border-2 border-fern/15 text-ink"
            >
              <div className="px-4 py-3 border-b border-ink/10">
                <p className="font-display text-sm text-ink truncate">{user.name}</p>
                <p className="text-xs text-ink/50 font-bold truncate">{user.email}</p>
                <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  user.role === "admin" ? "bg-lava/15 text-lava" : user.role === "manager" ? "bg-amber/15 text-amber" : "bg-fern/15 text-fern"
                }`}>
                  <ShieldCheck size={11} /> {ROLE_LABEL[user.role] || user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-lava hover:bg-lava/5 transition-colors disabled:opacity-60 rounded-b-2xl"
              >
                <LogOut size={16} />
                {loggingOut ? "Logging out…" : "Log Out"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
