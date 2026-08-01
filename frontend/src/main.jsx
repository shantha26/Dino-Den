import React from "react";
import ReactDOM from "react-dom/client";
import AuthGate from "./AuthGate.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";
import { installRippleEffect } from "./rippleEffect.js";

installRippleEffect();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </SettingsProvider>
  </React.StrictMode>
);
