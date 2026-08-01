import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE,
});

// Attaches the current session token (wherever it's stored) to every
// request. AuthContext owns reading/writing the actual storage; this just
// asks for whatever's there right now on each call, so login/logout take
// effect immediately without needing to rebuild the axios instance.
let getToken = () => null;
export function registerTokenGetter(fn) {
  getToken = fn;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Lets AuthContext react to an expired/invalid session (e.g. force logout)
// without every single call site having to check for 401 itself.
let onUnauthorized = () => {};
export function registerUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) onUnauthorized();
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signup = (payload) => api.post("/auth/signup", payload);
export const login = (payload) => api.post("/auth/login", payload);
export const logoutRequest = () => api.post("/auth/logout");
export const verifyEmail = (token) => api.post("/auth/verify-email", { token });
export const resendVerification = (email) => api.post("/auth/resend-verification", { email });
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });
export const resetPassword = (token, password) => api.post("/auth/reset-password", { token, password });
export const fetchMe = () => api.get("/auth/me");
export const verifyAdminSecurity = (password) => api.post("/auth/verify-admin-security", { password });
export const updateAdminSecurity = (currentPassword, newPassword) =>
  api.put("/auth/admin-security", { currentPassword, newPassword });
export const fetchUsers = () => api.get("/auth/users");
export const createStaffUser = (payload) => api.post("/auth/users", payload);
export const updateUserRole = (id, role) => api.put(`/auth/users/${id}/role`, { role });
export const deleteStaffUser = (id) => api.delete(`/auth/users/${id}`);
export const fetchActivityLogs = (limit) => api.get("/auth/activity-logs", { params: { limit } });

export const createCustomer = (payload) => api.post("/customers", payload);
export const fetchCustomers = (date) => api.get("/customers", { params: date ? { date } : {} });
export const fetchAllCustomers = () => api.get("/customers");
export const updateCustomer = (id, payload) => api.put(`/customers/${id}`, payload);
export const fetchStats = () => api.get("/customers/stats/overview");
export const fetchBirthdays = () => api.get("/customers/birthdays");
export const searchByMobile = (mobile) => api.get("/customers/search", { params: { mobile } });
export const fetchCustomerDirectory = (params) => api.get("/customers/directory", { params });

export const fetchWaitlistStatus = (date) => api.get("/waitlist/status", { params: { date } });
export const fetchWaitlist = (date) => api.get("/waitlist", { params: { date } });
export const joinWaitlist = (payload) => api.post("/waitlist", payload);
export const updateWaitlistEntry = (id, status) => api.put(`/waitlist/${id}`, { status });
export const removeWaitlistEntry = (id) => api.delete(`/waitlist/${id}`);

export const fetchSettings = () => api.get("/settings");
export const updateSettings = (payload) => api.put("/settings", payload);
export const resetSettings = () => api.post("/settings/reset");

export const fetchPromoCodes = (params) => api.get("/promo-codes", { params });
export const fetchLiveOffers = (date) => api.get("/promo-codes", { params: { live: true, date } });
export const validatePromoCode = (code, subtotal) => api.post("/promo-codes/validate", { code, subtotal });
export const createPromoCode = (payload) => api.post("/promo-codes", payload);
export const updatePromoCode = (id, payload) => api.put(`/promo-codes/${id}`, payload);
export const deletePromoCode = (id) => api.delete(`/promo-codes/${id}`);

// Notifications
export const fetchNotificationConfig = () => api.get("/notifications/config");
export const updateNotificationConfig = (payload) => api.put("/notifications/config", payload);
export const previewNotification = (payload) => api.post("/notifications/preview", payload);
export const sendTestNotification = (payload) => api.post("/notifications/send", payload);
export const sendBirthdayWishes = () => api.post("/notifications/send-birthday-wishes");
export const sendOfferToAll = (payload) => api.post("/notifications/send-offer-to-all", payload);
export const resetNotificationTemplates = () => api.post("/notifications/reset-templates");
