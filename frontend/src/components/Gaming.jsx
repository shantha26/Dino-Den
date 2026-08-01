import { motion } from "framer-motion";
import ServiceRow from "./ServiceRow.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

export default function Gaming({ order, setOrder }) {
  const { settings } = useSettings();
  const GAMING = settings.gamingPricing;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="bg-swamp/5 rounded-blob p-6 md:p-8 lg:p-10 border-2 border-swamp/15"
    >
      <h2 className="font-display text-2xl lg:text-3xl text-swamp mb-5 lg:mb-6 flex items-center gap-3">🎮 Gaming</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        <ServiceRow
          emoji="🕹️"
          title={`${GAMING.ps3.label} (per hr)`}
          priceLabel={`₹${GAMING.ps3.pricePerHour} / hr`}
          value={order.gaming.ps3Hours}
          onChange={(v) => setOrder((o) => ({ ...o, gaming: { ...o.gaming, ps3Hours: v } }))}
          accent="swamp"
          large
        />
        <ServiceRow
          emoji="🎮"
          title={`${GAMING.ps5.label} (per hr)`}
          priceLabel={`₹${GAMING.ps5.pricePerHour} / hr`}
          value={order.gaming.ps5Hours}
          onChange={(v) => setOrder((o) => ({ ...o, gaming: { ...o.gaming, ps5Hours: v } }))}
          accent="swamp"
          large
        />
      </div>
    </motion.section>
  );
}
