import { motion } from "framer-motion";
import ServiceRow from "./ServiceRow.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

export default function Socks({ order, setOrder }) {
  const { settings } = useSettings();
  const SOCKS = settings.socksPricing;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-amber/10 rounded-2xl p-4 sm:p-5 border-2 border-amber/25"
    >
      <h2 className="font-display text-lg sm:text-xl text-lava mb-3 md:mb-4 flex items-center gap-2">🧦 Socks</h2>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        <ServiceRow
          emoji="🧦"
          title={SOCKS.kid.label}
          priceLabel={`₹${SOCKS.kid.price} each`}
          value={order.socks.kidQty}
          onChange={(v) => setOrder((o) => ({ ...o, socks: { ...o.socks, kidQty: v } }))}
          accent="amber"
        />
        <ServiceRow
          emoji="🧦"
          title={SOCKS.adult.label}
          priceLabel={`₹${SOCKS.adult.price} each`}
          value={order.socks.adultQty}
          onChange={(v) => setOrder((o) => ({ ...o, socks: { ...o.socks, adultQty: v } }))}
          accent="amber"
        />
      </div>
    </motion.section>
  );
}
