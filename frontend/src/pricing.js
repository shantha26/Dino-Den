// Pricing used to be hardcoded here; it now comes from the Settings page
// (stored in MongoDB, fetched via SettingsContext) and is passed into
// computeTotals() as `settings`. The backend recomputes independently from
// the same live settings and is the source of truth for what actually gets
// billed and saved — this copy only drives the live on-screen total as
// staff make selections.

export function computeTotals(order, settings) {
  const softPlayPricing = settings?.softPlayPricing || [];
  const arcadePrice = settings?.arcadePricing?.coinPrice ?? 0;
  const basketballPrice = settings?.basketballPricing?.price ?? 0;
  const gaming = settings?.gamingPricing || { ps3: { label: "PS3", pricePerHour: 0 }, ps5: { label: "PS5", pricePerHour: 0 } };
  const socks = settings?.socksPricing || { kid: { label: "Kid Socks", price: 0 }, adult: { label: "Adult Socks", price: 0 } };
  const gstRate = (settings?.gstPercentage || 0) / 100;

  let playPackageCost = 0;
  const playLineItems = [];
  for (const pkg of softPlayPricing) {
    const qty = order.playPackages[pkg.key] || 0;
    const amount = qty * pkg.price;
    playPackageCost += amount;
    if (qty > 0) {
      playLineItems.push({ label: pkg.label, qty, unitPrice: pkg.price, amount, emoji: pkg.emoji });
    }
  }

  const arcadeLineItems = [];
  const coinQty = order.arcadeCoins || 0;
  const coinAmount = coinQty * arcadePrice;
  if (coinQty > 0) arcadeLineItems.push({ label: "Arcade Coins", qty: coinQty, unitPrice: arcadePrice, amount: coinAmount, emoji: "🪙" });

  const bballQty = order.basketballQty || 0;
  const bballAmount = bballQty * basketballPrice;
  if (bballQty > 0) arcadeLineItems.push({ label: "Basketball", qty: bballQty, unitPrice: basketballPrice, amount: bballAmount, emoji: "🏀" });

  const arcadeCost = coinAmount + bballAmount;

  const gamingLineItems = [];
  const ps3Hrs = order.gaming.ps3Hours || 0;
  const ps3Amount = ps3Hrs * gaming.ps3.pricePerHour;
  if (ps3Hrs > 0) gamingLineItems.push({ label: gaming.ps3.label || "PS3", qty: ps3Hrs, unitPrice: gaming.ps3.pricePerHour, amount: ps3Amount, emoji: "🕹️", unit: "hr" });

  const ps5Hrs = order.gaming.ps5Hours || 0;
  const ps5Amount = ps5Hrs * gaming.ps5.pricePerHour;
  if (ps5Hrs > 0) gamingLineItems.push({ label: gaming.ps5.label || "PS5", qty: ps5Hrs, unitPrice: gaming.ps5.pricePerHour, amount: ps5Amount, emoji: "🎮", unit: "hr" });

  const gamingCost = ps3Amount + ps5Amount;

  const socksLineItems = [];
  const kidSocksQty = order.socks.kidQty || 0;
  const kidSocksAmount = kidSocksQty * socks.kid.price;
  if (kidSocksQty > 0) socksLineItems.push({ label: socks.kid.label || "Kid Socks", qty: kidSocksQty, unitPrice: socks.kid.price, amount: kidSocksAmount, emoji: "🧦" });

  const adultSocksQty = order.socks.adultQty || 0;
  const adultSocksAmount = adultSocksQty * socks.adult.price;
  if (adultSocksQty > 0) socksLineItems.push({ label: socks.adult.label || "Adult Socks", qty: adultSocksQty, unitPrice: socks.adult.price, amount: adultSocksAmount, emoji: "🧦" });

  const socksCost = kidSocksAmount + adultSocksAmount;

  const subtotal = playPackageCost + arcadeCost + gamingCost + socksCost;
  // discountAmount is passed in via order.discount (a flat rupee amount, default 0)
  const discountAmount = Math.min(order.discount || 0, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = Math.round(afterDiscount * gstRate);
  const grandTotal = afterDiscount + gstAmount;

  const allLineItems = [
    ...playLineItems,
    ...arcadeLineItems,
    ...gamingLineItems,
    ...socksLineItems,
  ];

  return {
    playPackageCost,
    arcadeCost,
    gamingCost,
    socksCost,
    subtotal,
    discountAmount,
    gstAmount,
    gstRate,
    grandTotal,
    allLineItems,
  };
}

// When editing an existing booking, staff shouldn't be re-charged for
// services that were already paid for — only for newly added packages or
// quantity increases. Given the booking's original quantities (as loaded
// when the edit started) and the current, possibly-edited `order`, this
// returns just the delta: line items for whatever went up, and their total
// cost. Quantity decreases are ignored here (never negative, no refunds).
export function computeNewAdditions(order, settings, originalBooking) {
  if (!originalBooking) return { lineItems: [], cost: 0 };

  const softPlayPricing = settings?.softPlayPricing || [];
  const arcadePrice = settings?.arcadePricing?.coinPrice ?? 0;
  const basketballPrice = settings?.basketballPricing?.price ?? 0;
  const gaming = settings?.gamingPricing || { ps3: { label: "PS3", pricePerHour: 0 }, ps5: { label: "PS5", pricePerHour: 0 } };
  const socks = settings?.socksPricing || { kid: { label: "Kid Socks", price: 0 }, adult: { label: "Adult Socks", price: 0 } };

  const lineItems = [];
  let cost = 0;

  const addDelta = (label, emoji, oldQty, newQty, unitPrice, unit) => {
    const delta = Math.max((Number(newQty) || 0) - (Number(oldQty) || 0), 0);
    if (delta > 0 && unitPrice > 0) {
      const amount = delta * unitPrice;
      cost += amount;
      lineItems.push({ label, qty: delta, unitPrice, amount, emoji, unit });
    }
  };

  for (const pkg of softPlayPricing) {
    addDelta(
      pkg.label,
      pkg.emoji,
      originalBooking.playPackages?.[pkg.key],
      order.playPackages?.[pkg.key],
      pkg.price
    );
  }
  addDelta("Arcade Coins", "🪙", originalBooking.arcadeCoins, order.arcadeCoins, arcadePrice);
  addDelta("Basketball", "🏀", originalBooking.basketballQty, order.basketballQty, basketballPrice);
  addDelta(
    gaming.ps3.label || "PS3", "🕹️",
    originalBooking.gaming?.ps3Hours, order.gaming?.ps3Hours, gaming.ps3.pricePerHour, "hr"
  );
  addDelta(
    gaming.ps5.label || "PS5", "🎮",
    originalBooking.gaming?.ps5Hours, order.gaming?.ps5Hours, gaming.ps5.pricePerHour, "hr"
  );
  addDelta(
    socks.kid.label || "Kid Socks", "🧦",
    originalBooking.socks?.kidQty, order.socks?.kidQty, socks.kid.price
  );
  addDelta(
    socks.adult.label || "Adult Socks", "🧦",
    originalBooking.socks?.adultQty, order.socks?.adultQty, socks.adult.price
  );

  return { lineItems, cost };
}
