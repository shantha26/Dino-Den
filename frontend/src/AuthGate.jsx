import { useMemo, useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./components/auth/LoginPage.jsx";
import SignupPage from "./components/auth/SignupPage.jsx";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./components/auth/ResetPasswordPage.jsx";
import VerifyEmailPage from "./components/auth/VerifyEmailPage.jsx";
import LoadingScreen from "./components/shared/LoadingScreen.jsx";
import App from "./App.jsx";

// No react-router in this project — a link like /reset-password?token=...
// (from an email) is resolved once, on first load, straight from the URL.
// Everything after that is simple in-memory view state.
function initialViewFromUrl() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  if (path.startsWith("/reset-password")) return { view: "reset", token };
  if (path.startsWith("/verify-email")) return { view: "verify", token };
  return { view: "login", token: "" };
}

export default function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  const [{ view, token }, setNav] = useState(initialViewFromUrl);

  const navigate = (nextView) => {
    // Clear any leftover token-bearing path once the person navigates
    // elsewhere, so a stale reset link doesn't linger in the address bar.
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
    setNav({ view: nextView, token: "" });
  };

  const authScreen = useMemo(() => {
    switch (view) {
      case "signup":
        return <SignupPage onNavigate={navigate} />;
      case "forgot":
        return <ForgotPasswordPage onNavigate={navigate} />;
      case "reset":
        return <ResetPasswordPage token={token} onNavigate={navigate} />;
      case "verify":
        return <VerifyEmailPage token={token} onNavigate={navigate} />;
      default:
        return <LoginPage onNavigate={navigate} />;
    }
  }, [view, token]);

  if (loading) {
    return <LoadingScreen label="Waking up the dinosaurs…" />;
  }

  // Verification links should work even for someone who's already logged in
  // under a different account, so this check stays outside isAuthenticated.
  if (view === "verify") return authScreen;

  if (!isAuthenticated) return authScreen;

  return <App />;
}
