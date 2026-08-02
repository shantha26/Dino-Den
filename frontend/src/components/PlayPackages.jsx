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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-fern/5 rounded-2xl p-4 sm:p-5 border-2 border-fern/15"
    >
      <h2 className="font-display text-lg sm:text-xl text-fern mb-3 md:mb-4 flex items-center gap-2">
        🦕 Play Area Packages
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {PLAY_PACKAGES.map((pkg) => (
          <ServiceRow
            key={pkg.key}
            emoji={pkg.emoji}
            title={pkg.label}
            priceLabel={`₹${pkg.price}`}
            value={order.playPackages[pkg.key] || 0}
            onChange={(v) => setPkgQty(pkg.key, v)}
            accent="fern"
          />
        ))}
        <ServiceRow
          emoji="🪙"
          title="Arcade Coin"
          priceLabel={`₹${ARCADE_PRICE} / coin`}
          value={order.arcadeCoins}
          onChange={(v) => setOrder((o) => ({ ...o, arcadeCoins: v }))}
          accent="amber"
        />
        <ServiceRow
          emoji="🏀"
          title="Basketball"
          priceLabel={`₹${BASKETBALL_PRICE}`}
          value={order.basketballQty}
          onChange={(v) => setOrder((o) => ({ ...o, basketballQty: v }))}
          accent="lava"
        />
      </div>
    </motion.section>
  );
}
