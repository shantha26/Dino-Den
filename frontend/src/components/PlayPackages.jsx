import { motion } from "framer-motion";
import ServiceRow from "./ServiceRow.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

export default function PlayPackages({ order, setOrder }) {
  const { settings } = useSettings();
  const PLAY_PACKAGES = settings.softPlayPricing;
  const ARCADE_PRICE = settings.arcadePricing.coinPrice;
  const BASKETBALL_PRICE = settings.basketballPricing.price;

  const setPkgQty = (key, qty) =>
    setOrder((o) => ({ ...o, playPackages: { ...o.playPackages, [key]: qty } }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-fern/5 rounded-blob p-6 md:p-8 lg:p-10 border-2 border-fern/15"
    >
      <h2 className="font-display text-2xl lg:text-3xl text-fern mb-5 lg:mb-6 flex items-center gap-3">
        🦕 Play Area Packages
      </h2>

      <p className="text-xs lg:text-sm font-bold text-ink/40 uppercase tracking-widest mb-3 lg:mb-4">Soft Play</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6 mb-6 lg:mb-8">
        {PLAY_PACKAGES.map((pkg) => (
          <ServiceRow
            key={pkg.key}
            emoji={pkg.emoji}
            title={pkg.label}
            priceLabel={`₹${pkg.price}`}
            value={order.playPackages[pkg.key] || 0}
            onChange={(v) => setPkgQty(pkg.key, v)}
            accent="fern"
            large
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        <ServiceRow
          emoji="🪙"
          title="Arcade Coin"
          priceLabel={`₹${ARCADE_PRICE} / coin`}
          value={order.arcadeCoins}
          onChange={(v) => setOrder((o) => ({ ...o, arcadeCoins: v }))}
          accent="amber"
          large
        />
        <ServiceRow
          emoji="🏀"
          title="Basketball"
          priceLabel={`₹${BASKETBALL_PRICE}`}
          value={order.basketballQty}
          onChange={(v) => setOrder((o) => ({ ...o, basketballQty: v }))}
          accent="lava"
          large
        />
      </div>
    </motion.section>
  );
}
