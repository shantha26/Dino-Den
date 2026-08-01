import { motion } from "framer-motion";
import ServiceRow from "./ServiceRow.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

export default function Socks({ order, setOrder }) {
  const { settings } = useSettings();
  const SOCKS = settings.socksPricing;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="bg-amber/10 rounded-blob p-6 md:p-8 lg:p-10 border-2 border-amber/25"
    >
      <h2 className="font-display text-2xl lg:text-3xl text-lava mb-5 lg:mb-6 flex items-center gap-3">🧦 Socks</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        <ServiceRow
          emoji="🧦"
          title={SOCKS.kid.label}
          priceLabel={`₹${SOCKS.kid.price} each`}
          value={order.socks.kidQty}
          onChange={(v) => setOrder((o) => ({ ...o, socks: { ...o.socks, kidQty: v } }))}
          accent="amber"
          large
        />
        <ServiceRow
          emoji="🧦"
          title={SOCKS.adult.label}
          priceLabel={`₹${SOCKS.adult.price} each`}
          value={order.socks.adultQty}
          onChange={(v) => setOrder((o) => ({ ...o, socks: { ...o.socks, adultQty: v } }))}
          accent="amber"
          large
        />
      </div>
    </motion.section>
  );
}
