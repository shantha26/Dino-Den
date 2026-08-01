import { motion } from "framer-motion";

// Purely decorative, pointer-events-none animated backdrop. Kept low-opacity
// and z-indexed under the content so it never competes with real UI.
// Respects the app-wide prefers-reduced-motion rule in index.css (which
// flattens all animation durations to ~0).
//
// variant="auth" — full, richly-layered parallax scene for the full-bleed
//                   login/signup screens: mountains, a glowing volcano,
//                   a waterfall, swaying tree line, drifting clouds,
//                   fireflies, floating pollen/leaves, and a footprint trail.
// variant="app"  — fixed to the viewport (doesn't scroll with content),
//                   a quieter subset of the same layers so it stays a calm
//                   backdrop behind the dashboard, forms, tables, etc.

const FOOTPRINT = (
  <path d="M12 2c-2.2 0-3.6 1.9-3.6 4.2 0 2 1 3.6 2.4 4.6-1.7.5-3 2.4-3 4.6C7.8 18.3 9.7 20 12 20s4.2-1.7 4.2-4.6c0-2.2-1.3-4.1-3-4.6 1.4-1 2.4-2.6 2.4-4.6C15.6 3.9 14.2 2 12 2z" />
);

const LEAF = <path d="M2 12c0-6 4-10 10-10 0 6-4 10-10 10z" />;

const CONFIG = {
  auth: {
    wrapClass: "absolute inset-0 overflow-hidden",
    footprints: [
      { top: "20%", delay: 0, scale: 0.9, duration: 26 },
      { top: "46%", delay: 6, scale: 1.1, duration: 32 },
      { top: "70%", delay: 3, scale: 0.75, duration: 22 },
    ],
    pollenCount: 10,
    fireflyCount: 7,
    leafCount: 6,
    showWaterfall: true,
    showVolcano: true,
    treeOpacity: "text-ferndeep/[0.14]",
    mountainOpacity: "text-fern/[0.10]",
  },
  app: {
    wrapClass: "fixed inset-0 overflow-hidden",
    footprints: [{ top: "14%", delay: 0, scale: 0.7, duration: 38 }],
    pollenCount: 5,
    fireflyCount: 4,
    leafCount: 3,
    showWaterfall: false,
    showVolcano: true,
    treeOpacity: "text-ferndeep/[0.06]",
    mountainOpacity: "text-fern/[0.05]",
  },
};

export default function DinoBackground({ variant = "auth" }) {
  const cfg = CONFIG[variant] || CONFIG.auth;

  return (
    <div className={`pointer-events-none z-0 ${cfg.wrapClass}`} aria-hidden="true">
      {/* Sky wash */}
      <div className="absolute inset-0 bg-canopy-gradient opacity-60" />

      {/* Distant mountain ridge (parallax layer 1, slow drift) */}
      <motion.svg
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        className={`absolute bottom-24 left-0 w-[140%] ${cfg.mountainOpacity}`}
        style={{ height: 140 }}
        fill="currentColor"
        animate={{ x: ["-5%", "0%", "-5%"] }}
        transition={{ duration: 50, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M0 100 L40 40 L80 80 L130 20 L180 70 L230 30 L280 85 L330 45 L400 100 Z" />
      </motion.svg>

      {/* Glowing volcano, layered slightly closer than the ridge */}
      {cfg.showVolcano && (
        <div className="absolute bottom-24 right-[8%]" style={{ width: 90 }}>
          <svg viewBox="0 0 90 70" className="text-lava/20" fill="currentColor">
            <path d="M10 70 L34 14 L40 26 L45 10 L50 26 L56 14 L80 70 Z" />
          </svg>
          <motion.div
            className="absolute rounded-full bg-lava/40 blur-md"
            style={{ width: 14, height: 14, left: 38, top: 4 }}
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.2, 0.9] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Waterfall (auth only) — a soft, shimmering ribbon down the mountainside */}
      {cfg.showWaterfall && (
        <motion.div
          className="absolute bottom-24 left-[14%] w-2 rounded-full bg-gradient-to-b from-sky/70 via-fernlight/40 to-transparent"
          style={{ height: 110 }}
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Tree line swaying gently (parallax layer 2, closer + warmer) */}
      <div className={`absolute bottom-0 left-0 right-0 flex items-end justify-around ${cfg.treeOpacity}`} style={{ height: 90 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <svg
            key={`tree-${i}`}
            viewBox="0 0 40 60"
            style={{ width: 34 + (i % 3) * 10, height: 50 + (i % 3) * 10, transformOrigin: "bottom center" }}
            fill="currentColor"
            className="animate-sway"
          >
            <rect x="17" y="40" width="6" height="20" />
            <path d="M20 0 L36 30 H4 Z" />
            <path d="M20 12 L34 38 H6 Z" opacity="0.85" />
          </svg>
        ))}
      </div>

      {/* Drifting clouds, slow linear pass */}
      {[0, 1, 2].map((i) => (
        <motion.svg
          key={`cloud-${i}`}
          viewBox="0 0 100 40"
          className="absolute text-white/50"
          style={{ top: `${8 + i * 10}%`, width: 90 + i * 20 }}
          fill="currentColor"
          initial={{ x: "-20%" }}
          animate={{ x: "130vw" }}
          transition={{ duration: 70 + i * 18, delay: i * 10, repeat: Infinity, ease: "linear" }}
        >
          <ellipse cx="30" cy="24" rx="26" ry="14" />
          <ellipse cx="58" cy="18" rx="20" ry="16" />
          <ellipse cx="76" cy="26" rx="18" ry="11" />
        </motion.svg>
      ))}

      {/* Footprint trails wandering left-to-right across the screen */}
      {cfg.footprints.map((fp, i) => (
        <motion.div
          key={`fp-${i}`}
          className="absolute left-0 flex items-center gap-10 text-ferndeep/[0.08]"
          style={{ top: fp.top }}
          initial={{ x: "-10%" }}
          animate={{ x: "120%" }}
          transition={{ duration: fp.duration, delay: fp.delay, repeat: Infinity, ease: "linear" }}
        >
          {[0, 1, 2, 3, 4].map((j) => (
            <svg
              key={j}
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{
                width: 22 * fp.scale,
                height: 22 * fp.scale,
                transform: j % 2 === 0 ? "translateY(10px) rotate(-8deg)" : "translateY(-6px) rotate(8deg)",
              }}
            >
              {FOOTPRINT}
            </svg>
          ))}
        </motion.div>
      ))}

      {/* Floating pollen motes rising gently */}
      {Array.from({ length: cfg.pollenCount }).map((_, i) => (
        <motion.span
          key={`pollen-${i}`}
          className="absolute rounded-full bg-amberlight/40"
          style={{ left: `${(i * 97) % 100}%`, bottom: 0, width: 5, height: 5 }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: -420 - (i % 4) * 60, opacity: [0, 1, 1, 0], x: [0, 10, -10, 0] }}
          transition={{ duration: 14 + (i % 5) * 3, delay: i * 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Glowing fireflies twinkling in place */}
      {Array.from({ length: cfg.fireflyCount }).map((_, i) => (
        <span
          key={`firefly-${i}`}
          className="absolute rounded-full bg-firefly shadow-glow animate-twinkle"
          style={{
            left: `${(i * 53 + 7) % 96}%`,
            top: `${(i * 37 + 15) % 80}%`,
            width: 4,
            height: 4,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      {/* Softly drifting leaves tumbling down */}
      {Array.from({ length: cfg.leafCount }).map((_, i) => (
        <motion.svg
          key={`leaf-${i}`}
          viewBox="0 0 24 24"
          className="absolute text-fern/25"
          style={{ left: `${(i * 61 + 4) % 92}%`, width: 14, height: 14 }}
          fill="currentColor"
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: 700, opacity: [0, 1, 1, 0], rotate: 220, x: [0, 24, -12, 0] }}
          transition={{ duration: 16 + (i % 4) * 3, delay: i * 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {LEAF}
        </motion.svg>
      ))}
    </div>
  );
}
