
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/ui/Input";
import { loginSchema } from "../utils/validators";
import { useAuth } from "../context/AuthContext";

const authError = (e) => {
  console.error("AUTH ERROR:", e);

  const map = {
    "auth/invalid-credential": "Incorrect email or password",
    "auth/too-many-requests": "Too many attempts. Try again later",
    "auth/popup-closed-by-user": "Google sign-in was cancelled",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled in Firebase.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/network-request-failed":
      "Network error. Please check your internet connection.",
      "auth/user-disabled": "Your account has been suspended. Please contact support.",
  };

  if (map[e.code]) return map[e.code];

  if (e.response) {
    return `Server error: ${
      e.response.data?.message || e.response.status
    }`;
  }

  if (e.code) return e.code;

  return e.message || "Something went wrong";
};

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const go = (user) => {
        navigate("/dashboard");
  };

  const onSubmit = async ({ email, password }) => {
    try {
      const user = await login(email, password);
      go(user);
    } catch (e) {
      toast.error(authError(e));
    }
  };

  const onGoogle = async () => {
    try {
      const user = await loginWithGoogle();
      go(user);
    } catch (e) {
      toast.error(authError(e));
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome Back"
      subtitle="Sign in to access your dashboard and start earning"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <Input
          label="Email Address"
          icon={Mail}
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          icon={Lock}
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-brand-400 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 font-display font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {isSubmitting ? (
            "Signing in..."
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <div className="h-px flex-1 bg-line" />
          OR
          <div className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-field text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-zinc-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-brand-400 hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
