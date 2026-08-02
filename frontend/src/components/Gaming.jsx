import { motion } from "framer-motion";
import ServiceRow from "./ServiceRow.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

export default function Gaming({ order, setOrder }) {
  const { settings } = useSettings();
  const GAMING = settings.gamingPricing;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="bg-swamp/5 rounded-2xl p-4 sm:p-5 border-2 border-swamp/15"
    >
      <h2 className="font-display text-lg sm:text-xl text-swamp mb-3 md:mb-4 flex items-center gap-2">🎮 Gaming</h2>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        <ServiceRow
          emoji="🕹️"
          title={`${GAMING.ps3.label} (per hr)`}
          priceLabel={`₹${GAMING.ps3.pricePerHour} / hr`}
          value={order.gaming.ps3Hours}
          onChange={(v) => setOrder((o) => ({ ...o, gaming: { ...o.gaming, ps3Hours: v } }))}
          accent="swamp"
        />
        <ServiceRow
          emoji="🎮"
          title={`${GAMING.ps5.label} (per hr)`}
          priceLabel={`₹${GAMING.ps5.pricePerHour} / hr`}
          value={order.gaming.ps5Hours}
          onChange={(v) => setOrder((o) => ({ ...o, gaming: { ...o.gaming, ps5Hours: v } }))}
          accent="swamp"
        />
      </div>
    </motion.section>
  );
}
