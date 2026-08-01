import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchSettings, updateSettings as apiUpdateSettings, resetSettings as apiResetSettings } from "../api.js";

// Fallback shape used only until the real settings arrive from the backend,
// so components can destructure without null-checks on first render.
const FALLBACK_SETTINGS = {
  businessName: "Kids Play Area Management System",
  logo: "",
  gstPercentage: 0,
  maxCapacity: 40,
  avgSessionMinutes: 60,
  softPlayPricing: [
    { key: "half_hour_soft_play", label: "Half Hour Soft Play", price: 200, emoji: "🥚" },
    { key: "unlimited_soft_play", label: "Unlimited Soft Play", price: 300, emoji: "🦕" },
    { key: "unlimited_soft_play_arcade", label: "Unlimited Soft Play + 6 Arcade Coins", price: 500, emoji: "🦖" },
  ],
  arcadePricing: { coinPrice: 40 },
  basketballPricing: { price: 80 },
  gamingPricing: {
    ps3: { label: "PS3", pricePerHour: 50 },
    ps5: { label: "PS5", pricePerHour: 100 },
  },
  socksPricing: {
    kid: { label: "Kid Socks", price: 20 },
    adult: { label: "Adult Socks", price: 30 },
  },
  membershipPlans: [
    { name: "VIP", minVisits: 20 },
    { name: "Gold", minVisits: 10 },
    { name: "Silver", minVisits: 5 },
    { name: "Regular", minVisits: 2 },
    { name: "New", minVisits: 0 },
  ],
  notifications: {
    whatsapp: { provider: "none", apiKey: "", apiSecret: "", fromNumber: "", configured: false },
    email: { provider: "none", apiKey: "", fromEmail: "", fromName: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", configured: false },
    templates: {},
  },
};

const SettingsContext = createContext({
  settings: FALLBACK_SETTINGS,
  loading: true,
  loaded: false,
  error: "",
  refresh: async () => {},
  save: async () => {},
  reset: async () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchSettings();
      setSettings(data);
      setLoaded(true);
    } catch {
      setError("Could not load settings — check that the backend server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Applies a partial update, saves it to the backend, and updates local
  // state with whatever the server persisted (so validation/normalization
  // on the backend is always reflected back).
  const save = useCallback(async (patch) => {
    const { data } = await apiUpdateSettings(patch);
    setSettings(data);
    return data;
  }, []);

  const reset = useCallback(async () => {
    const { data } = await apiResetSettings();
    setSettings(data);
    return data;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, loaded, error, refresh, save, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
