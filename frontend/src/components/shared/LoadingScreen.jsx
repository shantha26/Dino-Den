import { motion } from "framer-motion";
import { TRex } from "./AnimatedDinosaurs.jsx";
import DinoBackground from "./DinoBackground.jsx";

// Full-screen (or inline, via `inline`) loading state: a walking T-Rex
// strolling above a row of fossil-bone "footsteps" that light up in
// sequence — reads as a progress bar without needing a real percentage.
export default function LoadingScreen({ label = "Waking up the dinosaurs…", inline = false }) {
  const bones = Array.from({ length: 6 });

  const content = (
    <div className="relative z-10 flex flex-col items-center gap-5">
      <motion.div
        animate={{ x: [-40, 40, -40] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <TRex className="w-24 h-24" />
      </motion.div>

      <div className="flex items-center gap-2">
        {bones.map((_, i) => (
          <motion.span
            key={i}
            className="block w-3 h-3 rounded-full bg-amber shadow-glowamber"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>

      <p className="font-display text-fern/80 text-sm tracking-wide">{label}</p>
    </div>
  );

  if (inline) {
    return <div className="flex items-center justify-center py-10">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-cream jungle-bg flex items-center justify-center relative overflow-hidden">
      <DinoBackground variant="app" />
      {content}
    </div>
  );
}
