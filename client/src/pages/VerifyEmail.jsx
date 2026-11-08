import { MailCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const { user, resendVerification, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to="/dashboard" replace />;

  const check = async () => {
    await refreshUser();
    // after reload, if verified the route guard above redirects automatically
    toast("Not verified yet. Check your inbox (and spam).");
  };

  const resend = async () => {
    try { await resendVerification(); toast.success("Verification email sent"); }
    catch { toast.error("Please wait a minute before resending"); }
  };

  return (
    <AuthLayout icon={MailCheck} title="Verify your email" subtitle={`We sent a link to ${user.email}`}>
      <div className="space-y-3">
        <button onClick={check} className="h-12 w-full rounded-xl bg-brand-500 font-semibold text-white hover:bg-brand-600">I've verified my email</button>
        <button onClick={resend} className="h-12 w-full rounded-xl border border-line text-sm text-white hover:bg-zinc-800">Resend email</button>
        <button onClick={async () => { await logout(); navigate("/login"); }} className="w-full text-sm text-zinc-500 hover:text-zinc-300">Use a different account</button>
      </div>
    </AuthLayout>
  );
}