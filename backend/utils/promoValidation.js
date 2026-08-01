// Shared validation so a promo code is checked the exact same way whether
// it's being previewed (POST /api/promo-codes/validate) or actually applied
// to a booking (POST/PUT /api/customers). Keeping this in one place avoids
// the two flows silently drifting apart.

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { todayStr };

// Is this promo code currently joinable/applicable "as-is" (no subtotal
// check — that part only matters once there's an actual order)? Used to
// decide what counts as a "live offer" worth surfacing in notifications,
// the waitlist join response, etc.
export function isPromoLive(promo, date = todayStr()) {
  if (!promo || !promo.active) return false;
  if (promo.startDate && date < promo.startDate) return false;
  if (promo.endDate && date > promo.endDate) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  return true;
}

// Returns { valid: true, discountAmount } or { valid: false, reason }.
export function validatePromo(promo, subtotal) {
  if (!promo) return { valid: false, reason: "Promo code not found" };
  if (!promo.active) return { valid: false, reason: "This promo code is no longer active" };

  const today = todayStr();
  if (promo.startDate && today < promo.startDate) {
    return { valid: false, reason: "This promo code isn't active yet" };
  }
  if (promo.endDate && today > promo.endDate) {
    return { valid: false, reason: "This promo code has expired" };
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { valid: false, reason: "This promo code has reached its usage limit" };
  }
  if (!subtotal || subtotal <= 0) {
    return { valid: false, reason: "Add items to the order before applying a promo code" };
  }

  let discountAmount =
    promo.type === "flat" ? promo.value : Math.round((subtotal * promo.value) / 100);
  if (promo.type === "percentage" && promo.maxDiscountAmount) {
    discountAmount = Math.min(discountAmount, promo.maxDiscountAmount);
  }
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  return { valid: true, discountAmount };
}
