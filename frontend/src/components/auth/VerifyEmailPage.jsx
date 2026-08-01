import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import AuthLayout from "./AuthLayout.jsx";
import { verifyEmail } from "../../api.js";

export default function VerifyEmailPage({ token, onNavigate }) {
  const [status, setStatus] = useState("checking"); // checking | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    verifyEmail(token)
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err?.response?.data?.error || "That verification link is invalid or has expired.");
      });
  }, [token]);

  return (
    <AuthLayout title="Email Verification" subtitle="">
      <div className="flex flex-col items-center gap-3 text-center py-6">
        {status === "checking" && <Loader2 className="animate-spin text-fern" size={40} />}
        {status === "success" && <CheckCircle2 className="text-fern" size={40} />}
        {status === "error" && <XCircle className="text-lava" size={40} />}
        <p className="font-bold text-ink/70">
          {status === "checking" ? "Verifying your email…" : message}
        </p>
        {status !== "checking" && (
          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="mt-2 rounded-2xl bg-fern text-cream font-display text-sm tracking-wide px-6 py-2.5 shadow-pop"
          >
            Go to Login
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
