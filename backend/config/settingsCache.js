// In-memory cache over the singleton Settings document in MongoDB.
//
// Pricing needs to be read synchronously in hot paths (computeTotals runs
// inline while building a response), so instead of awaiting a DB read on
// every request, we load the settings document once at boot and keep a
// plain-object copy here. Any PUT /api/settings request updates Mongo and
// then refreshes this cache in the same call, so every request after that
// sees the new values immediately.
import Settings from "../models/Settings.js";

const SETTINGS_KEY = "app_settings";

let cache = null;

// Loads (or creates, on first run) the settings document and populates the
// in-memory cache. Call once at server startup before accepting traffic.
export async function loadSettings() {
  let doc = await Settings.findOne({ key: SETTINGS_KEY });
  if (!doc) {
    doc = await Settings.create({ key: SETTINGS_KEY });
  }
  cache = doc.toObject();
  return cache;
}

// Synchronous read of whatever is currently cached. Throws if loadSettings()
// hasn't run yet, since that would indicate a startup-order bug rather than
// something callers should silently paper over.
export function getSettings() {
  if (!cache) {
    throw new Error("Settings cache not initialized — loadSettings() must run before use");
  }
  return cache;
}

// Applies a partial update to the settings document and refreshes the cache.
export async function updateSettings(patch) {
  const doc = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: patch },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  cache = doc.toObject();
  return cache;
}
