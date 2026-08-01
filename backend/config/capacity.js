// Capacity now lives in the Settings collection and is editable from the
// Settings page (see config/settingsCache.js). These getters read the
// in-memory cache so existing synchronous call sites don't need to change.
import { getSettings } from "./settingsCache.js";

export function getMaxCapacity() {
  return getSettings().maxCapacity;
}

export function getAvgSessionMinutes() {
  return getSettings().avgSessionMinutes;
}
