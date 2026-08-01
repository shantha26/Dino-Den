// Shared helpers for turning raw visit documents into customer-facing
// profile stats (membership tier, loyalty points, birthday countdown).
// Kept in one place so the customer directory and the single-mobile
// search endpoint never drift out of sync with each other.
//
// Nothing here touches the database — the Customer collection stays
// exactly as it is (one document per visit/booking). These are pure
// functions computed on the fly from that existing data.

import { getSettings } from "../config/settingsCache.js";

// Membership plans (name + minimum visit threshold) are editable from the
// Settings page and stored in MongoDB — see backend/models/Settings.js.
export function getMembershipPlans() {
  return getSettings().membershipPlans;
}

export function computeMembershipTier(totalVisits) {
  const tiers = [...getMembershipPlans()].sort((a, b) => b.minVisits - a.minVisits);
  for (const tier of tiers) {
    if (totalVisits >= tier.minVisits) return tier.name;
  }
  return tiers[tiers.length - 1]?.name || "New";
}

// Loyalty points: 1 point for every ₹100 spent, lifetime, rounded down.
// Derived from billing.grandTotal across all of a customer's visits —
// no separate points ledger to keep in sync.
export const RUPEES_PER_POINT = 100;
export function computeLoyaltyPoints(totalSpent) {
  return Math.floor((totalSpent || 0) / RUPEES_PER_POINT);
}

// Days remaining until the next occurrence of a date-of-birth's month/day
// (0 = today, counts up to 365). Returns null when there's no usable DOB.
export function daysUntilBirthday(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

// Builds a full profile + stats object from a group of visit documents
// that all share the same mobile number (i.e. one family/customer).
// `visits` must already be sorted newest-first by createdAt.
export function buildCustomerProfile(mobileNumber, visits) {
  const latest = visits[0];
  const totalVisits = visits.length;
  const totalSpent = visits.reduce((sum, v) => sum + (v.billing?.grandTotal || 0), 0);

  // Sibling-aware: a family can bring more than one kid under the same
  // mobile number, so collect every distinct kid name seen — both the
  // primary kid on each visit and any siblings added to that same booking.
  const kidNames = [
    ...new Set(
      visits.flatMap((v) => [
        v.kidName,
        ...(v.additionalKids || []).map((k) => k.kidName),
      ]).filter(Boolean)
    ),
  ];

  // Most recent non-empty date of birth (covers the case where an older
  // visit was logged before DOB was captured).
  const dob = visits.find((v) => v.dob)?.dob || null;

  const dates = visits.map((v) => v.date).filter(Boolean).sort();

  return {
    mobileNumber,
    parentName: latest.parentName,
    kidName: latest.kidName,
    kidNames,
    dob,
    totalVisits,
    totalSpent,
    firstVisit: dates[0] || null,
    lastVisit: dates[dates.length - 1] || null,
    membership: computeMembershipTier(totalVisits),
    loyaltyPoints: computeLoyaltyPoints(totalSpent),
    birthdayInDays: daysUntilBirthday(dob),
  };
}
