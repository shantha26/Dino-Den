// Pricing is now sourced live from the Settings collection (see
// config/settingsCache.js) instead of being hardcoded here. These getters
// read the in-memory cache, so they stay cheap to call from hot paths like
// computeTotals() while still reflecting whatever staff last saved on the
// Settings page.
import { getSettings } from "./settingsCache.js";

// { [packageKey]: { label, price, emoji } } — keyed the same way
// Customer.playPackages is, so existing bookings/keys keep working even as
// labels/prices/emoji are edited from the Settings page.
export function getPlayPackages() {
  const { softPlayPricing } = getSettings();
  const map = {};
  for (const pkg of softPlayPricing) {
    map[pkg.key] = { label: pkg.label, price: pkg.price, emoji: pkg.emoji };
  }
  return map;
}

export function getArcade() {
  return { price: getSettings().arcadePricing.coinPrice };
}

export function getBasketball() {
  return { price: getSettings().basketballPricing.price };
}

export function getGaming() {
  return getSettings().gamingPricing;
}

export function getSocks() {
  return getSettings().socksPricing;
}

export function getGstPercentage() {
  return getSettings().gstPercentage || 0;
}

export function computeTotals(order = {}) {
  const PLAY_PACKAGES = getPlayPackages();
  const ARCADE = getArcade();
  const BASKETBALL = getBasketball();
  const GAMING = getGaming();
  const SOCKS = getSocks();

  const playPackages = order.playPackages || {};
  let playPackageCost = 0;
  for (const key of Object.keys(PLAY_PACKAGES)) {
    const qty = Number(playPackages[key]) || 0;
    playPackageCost += qty * PLAY_PACKAGES[key].price;
  }

  const arcadeCoins = Number(order.arcadeCoins) || 0;
  const basketballQty = Number(order.basketballQty) || 0;
  const arcadeCost = arcadeCoins * ARCADE.price + basketballQty * BASKETBALL.price;

  const gaming = order.gaming || {};
  const ps3Hours = Number(gaming.ps3Hours) || 0;
  const ps5Hours = Number(gaming.ps5Hours) || 0;
  const gamingCost = ps3Hours * GAMING.ps3.pricePerHour + ps5Hours * GAMING.ps5.pricePerHour;

  const socks = order.socks || {};
  const kidSocks = Number(socks.kidQty) || 0;
  const adultSocks = Number(socks.adultQty) || 0;
  const socksCost = kidSocks * SOCKS.kid.price + adultSocks * SOCKS.adult.price;

  const subtotal = playPackageCost + arcadeCost + gamingCost + socksCost;

  // grandTotal here is pre-discount, pre-GST — routes/customers.js applies
  // any manual discount or promo code, then GST, on top of this.
  return { playPackageCost, arcadeCost, gamingCost, socksCost, subtotal, grandTotal: subtotal };
}
