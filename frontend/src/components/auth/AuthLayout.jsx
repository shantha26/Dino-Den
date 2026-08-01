import { motion } from "framer-motion";
import { useSettings } from "../../context/SettingsContext.jsx";
import DinoBackground from "../shared/DinoBackground.jsx";
import { Triceratops, Pterodactyl } from "../shared/AnimatedDinosaurs.jsx";

const DINO_LOGO = "/dino-den-logo.png";

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { settings } = useSettings();
  const logoSrc = settings.logo || DINO_LOGO;

  return (
    <div className="relative min-h-screen bg-cream jungle-bg flex items-center justify-center px-4 py-10 overflow-hidden">
      <DinoBackground variant="auth" />

      {/* Wandering mascots — hidden on small screens so they never crowd the
          card, tucked to the sides on larger viewports. */}
      <motion.div
        className="hidden lg:block absolute z-10"
        style={{ left: "6%", top: "58%" }}
        animate={{ x: ["0%", "220%", "0%"] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      >
        <Triceratops className="w-24 h-20 opacity-90" />
      </motion.div>
      <motion.div
        className="hidden lg:block absolute z-10"
        style={{ right: "10%", top: "12%" }}
        animate={{ x: ["0%", "-160%", "0%"], y: [0, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      >
        <Pterodactyl className="w-28 h-20 opacity-90" />
      </motion.div>

      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Hero badge — the Dino Den logo gets pride of place above the card,
            with a playful pop-in + gentle bob so it feels alive, not static. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="mb-4 flex flex-col items-center"
        >
          <motion.img
            src={logoSrc}
            alt={settings.businessName}
            className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-pop border-4 border-amber/30 bg-swamp"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <p className="mt-2 font-display text-xs tracking-[0.2em] text-fern/60 uppercase">
            Laugh. Play. Repeat.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
          className="w-full glass-card rounded-blob shadow-pop border-2 border-fern/15 overflow-hidden"
        >
          <div className="bg-jungle-gradient px-6 py-6 flex items-center gap-3 text-cream">
            <img src={logoSrc} alt="" className="w-10 h-10 rounded-full object-cover shadow-popsm border-2 border-cream/30" />
            <div>
              <p className="font-display text-lg tracking-wide leading-tight">{settings.businessName}</p>
              <p className="text-xs text-cream/70 font-bold">{title}</p>
            </div>
          </div>

          <div className="px-6 py-6 flex flex-col gap-4">
            {subtitle && <p className="text-ink/60 text-sm font-bold -mt-1">{subtitle}</p>}
            {children}
          </div>

          {footer && (
            <div className="px-6 py-4 border-t border-ink/10 bg-ink/[0.02] text-center text-sm">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
