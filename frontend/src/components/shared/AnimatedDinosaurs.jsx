import { motion } from "framer-motion";

// A small cast of adorable-but-professional dinosaur mascots. Each is a
// lightweight, flat-vector SVG (no external image assets, so they render
// crisply at any size and stay on-brand with the palette). Continuous idle
// motion — blinking, breathing, tail-wagging, walking, flying — is driven by
// the CSS keyframes registered in tailwind.config.js, which keeps many
// on-screen instances cheap and automatically respects
// prefers-reduced-motion (flattened in index.css). The outer wrapper uses
// Framer Motion for the one-time entrance + gentle floating drift.
//
// Usage: <TRex className="w-20 h-20" /> or wrap in a positioned <div> for
// scene placement (see ParallaxJungleBackground / AuthLayout / Dashboard).

const Eye = ({ cx, cy, r = 4 }) => (
  <g className="animate-blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
    <circle cx={cx} cy={cy} r={r} fill="#2A2116" />
    <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.32} fill="#FFFBF2" />
  </g>
);

function MascotFrame({ children, viewBox, className, float = true, delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.6, y: 14 }}
      animate={
        float
          ? { opacity: 1, scale: 1, y: [0, -8, 0] }
          : { opacity: 1, scale: 1, y: 0 }
      }
      transition={
        float
          ? { opacity: { duration: 0.5, delay }, scale: { type: "spring", stiffness: 180, damping: 14, delay }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 } }
          : { type: "spring", stiffness: 180, damping: 14, delay }
      }
    >
      <svg viewBox={viewBox} className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
        {children}
      </svg>
    </motion.div>
  );
}

export function TRex({ className = "w-24 h-24" }) {
  return (
    <MascotFrame className={className} viewBox="0 0 140 130">
      <g className="animate-walkbob">
        <g className="animate-breathe" style={{ transformOrigin: "70px 90px" }}>
          <ellipse cx="70" cy="100" rx="16" ry="10" fill="#0E3B26" opacity="0.15" />
          <path d="M40 100c-4-4-6-10-6-18 0-16 12-30 30-34 4-10 14-18 24-18 6 0 8 5 5 9-3 4-9 4-11 9 9 1 17 7 21 16 3 6 3 13 0 19 6 2 10 8 10 15 0 9-7 16-16 16H56c-8 0-16-6-16-14z" fill="#159957" />
          <path d="M40 100c-4-4-6-10-6-18 0-16 12-30 30-34 4-10 14-18 24-18 6 0 8 5 5 9-3 4-9 4-11 9 9 1 17 7 21 16 3 6 3 13 0 19" fill="none" stroke="#0B6B3A" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          <Eye cx={83} cy={44} r={4.4} />
          <path d="M96 46c5 1 9 4 11 8" stroke="#0B6B3A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M99 52l6-2-2 6z" fill="#E0A63A" />
        </g>
        <g className="animate-tailwag" style={{ transformOrigin: "44px 96px" }}>
          <path d="M44 96c-10 2-20 0-28-6 8 8 10 16 6 24 8-4 16-10 22-18z" fill="#54D69C" />
        </g>
        <rect x="52" y="112" width="8" height="14" rx="3" fill="#0B6B3A" />
        <rect x="76" y="112" width="8" height="14" rx="3" fill="#0B6B3A" />
      </g>
    </MascotFrame>
  );
}

export function Triceratops({ className = "w-24 h-24" }) {
  return (
    <MascotFrame className={className} viewBox="0 0 150 110" delay={0.05}>
      <g className="animate-walkbob">
        <g className="animate-breathe" style={{ transformOrigin: "75px 70px" }}>
          <ellipse cx="80" cy="78" rx="15" ry="9" fill="#0E3B26" opacity="0.15" />
          <path d="M30 74c-2-16 10-28 26-30 2-8 10-16 20-16 8 0 12 6 10 12 10 0 20 6 24 16 6 2 10 8 10 16 0 10-8 18-18 18H50c-12 0-19-8-20-16z" fill="#E0A63A" />
          <path d="M56 44c-6-2-10-8-8-16 2 6 6 10 12 12z" fill="#F4CD79" />
          <path d="M34 46c-6 0-12-6-12-14 4 6 8 10 14 12z" fill="#F4CD79" />
          <path d="M76 28c-4-8 0-16 6-20-2 8 0 14 4 18z" fill="#F4CD79" />
          <Eye cx={78} cy={46} r={4} />
          <path d="M100 52c4 0 7 3 8 6" stroke="#C1552C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
        <g className="animate-tailwag" style={{ transformOrigin: "34px 74px" }}>
          <path d="M34 74c-8 2-14 0-20-6 6 6 8 12 4 18 6-2 12-6 16-12z" fill="#F4CD79" />
        </g>
        <rect x="46" y="90" width="8" height="12" rx="3" fill="#C1552C" />
        <rect x="66" y="92" width="8" height="12" rx="3" fill="#C1552C" />
        <rect x="90" y="90" width="8" height="12" rx="3" fill="#C1552C" />
      </g>
    </MascotFrame>
  );
}

export function Brachiosaurus({ className = "w-24 h-32" }) {
  return (
    <MascotFrame className={className} viewBox="0 0 140 180" delay={0.1}>
      <g className="animate-breathe" style={{ transformOrigin: "70px 130px" }}>
        <ellipse cx="70" cy="160" rx="20" ry="8" fill="#0E3B26" opacity="0.15" />
        <path d="M30 130c-10 0-18-8-18-18s8-18 18-18c2-14 14-24 28-24 6 0 12 2 16 6 8-16 14-40 12-58 10 10 16 34 12 54 8 4 14 12 14 22 0 4-1 8-3 11 6 4 9 10 9 17 0 12-10 22-22 22H30z" fill="#54D69C" />
        <path d="M78 18c2 16-2 36-10 50" stroke="#0B6B3A" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
        <Eye cx={80} cy={22} r={4.2} />
        <rect x="40" y="146" width="10" height="18" rx="4" fill="#0B6B3A" />
        <rect x="60" y="150" width="10" height="18" rx="4" fill="#0B6B3A" />
        <rect x="86" y="150" width="10" height="18" rx="4" fill="#0B6B3A" />
        <rect x="104" y="146" width="10" height="18" rx="4" fill="#0B6B3A" />
      </g>
      <g className="animate-tailwag" style={{ transformOrigin: "28px 128px" }}>
        <path d="M28 128c-10 4-18 4-26 0 8 4 12 10 10 18 6-4 12-11 16-18z" fill="#54D69C" />
      </g>
    </MascotFrame>
  );
}

export function Stegosaurus({ className = "w-28 h-20" }) {
  return (
    <MascotFrame className={className} viewBox="0 0 170 100" delay={0.15}>
      <g className="animate-walkbob">
        <g className="animate-breathe" style={{ transformOrigin: "85px 60px" }}>
          <ellipse cx="85" cy="76" rx="18" ry="8" fill="#0E3B26" opacity="0.15" />
          <path d="M30 66c-6 0-10-5-10-11s4-10 10-11c2-12 14-22 30-24l2-8 8 6c8-2 18 0 24 6l6-6 4 8c8 2 14 8 16 16 6 2 10 7 10 13 0 8-6 14-14 14H36z" fill="#0B6B3A" />
          <path d="M46 20l10 8-4 10z" fill="#C1552C" />
          <path d="M66 12l10 10-2 10z" fill="#E0A63A" />
          <path d="M88 10l10 12-2 10z" fill="#C1552C" />
          <path d="M108 16l8 12-4 10z" fill="#E0A63A" />
          <Eye cx={44} cy={48} r={3.8} />
        </g>
        <g className="animate-tailwag" style={{ transformOrigin: "128px 62px" }}>
          <path d="M128 62c10 0 18 4 22 12-4-8-2-14 4-20-8 0-18 3-26 8z" fill="#0B6B3A" />
          <path d="M148 52l6-8 2 8-6 6z" fill="#C1552C" />
          <path d="M152 66l8-4-2 8-8 2z" fill="#C1552C" />
        </g>
        <rect x="44" y="78" width="9" height="12" rx="3" fill="#0E3B26" />
        <rect x="64" y="80" width="9" height="12" rx="3" fill="#0E3B26" />
        <rect x="96" y="80" width="9" height="12" rx="3" fill="#0E3B26" />
        <rect x="114" y="78" width="9" height="12" rx="3" fill="#0E3B26" />
      </g>
    </MascotFrame>
  );
}

export function Velociraptor({ className = "w-20 h-24" }) {
  return (
    <MascotFrame className={className} viewBox="0 0 110 140" delay={0.2}>
      <g className="animate-walkbob">
        <g className="animate-breathe" style={{ transformOrigin: "55px 80px" }}>
          <ellipse cx="55" cy="118" rx="14" ry="7" fill="#0E3B26" opacity="0.15" />
          <path d="M34 90c-6-2-10-8-10-16 0-14 10-26 24-28 2-8 8-16 16-18 4-1 7 2 6 6-1 3-4 4-5 7 7 1 13 6 16 13 4-1 8 2 8 7 0 4-2 7-6 8 2 3 3 6 3 10 0 10-8 18-18 18H34z" fill="#C1552C" />
          <Eye cx={58} cy={44} r={3.6} />
          <path d="M70 46l8-2-3 7z" fill="#E0A63A" />
        </g>
        <g className="animate-tailwag" style={{ transformOrigin: "34px 88px" }}>
          <path d="M34 88c-10 4-16 12-16 22 4-8 10-12 18-12z" fill="#E0A63A" />
        </g>
        <rect x="38" y="104" width="9" height="20" rx="4" fill="#8A3B2E" />
        <rect x="58" y="104" width="9" height="20" rx="4" fill="#8A3B2E" />
      </g>
    </MascotFrame>
  );
}

export function Pterodactyl({ className = "w-28 h-20" }) {
  return (
    <MascotFrame className={className} viewBox="0 0 180 100" float={false} delay={0.25}>
      <g className="animate-breathe" style={{ transformOrigin: "90px 50px" }}>
        <g className="animate-flap" style={{ transformOrigin: "90px 46px" }}>
          <path d="M90 46 30 10c-4 20 6 34 24 40z" fill="#54D69C" />
          <path d="M90 46 150 10c4 20-6 34-24 40z" fill="#159957" />
        </g>
        <ellipse cx="90" cy="50" rx="16" ry="10" fill="#0B6B3A" />
        <path d="M104 46c8-2 16-2 22 2-6 0-12 2-16 6z" fill="#0B6B3A" />
        <path d="M74 40c-6-6-8-14-4-20 2 6 6 10 10 12z" fill="#E0A63A" />
        <Eye cx={100} cy={46} r={3.6} />
      </g>
    </MascotFrame>
  );
}

export const DINOS = { TRex, Triceratops, Brachiosaurus, Stegosaurus, Velociraptor, Pterodactyl };
