
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

import AuthLayout from "../components/AuthLayout";
import Input from "../components/ui/Input";
import { registerSchema } from "../utils/validators";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getStoredRef } from "../utils/referral";

const COUNTRIES = [
  "Pakistan",
  "India",
  "Bangladesh",
  "United Arab Emirates",
  "Saudi Arabia",
  "United Kingdom",
  "United States",
];

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Read referral code from URL or previously stored referral
  const startRef = (
    params.get("ref") ||
    getStoredRef() ||
    ""
  ).trim().toUpperCase();

  const [showRef, setShowRef] = useState(!!startRef);
  const [refInfo, setRefInfo] = useState({ status: "idle" });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: "+92",
      country: "Pakistan",
      referralCode: startRef,
    },
  });

  const refValue = watch("referralCode");

  // Validate referral code when it changes
  useEffect(() => {
    const code = (refValue || "").trim().toUpperCase();

    if (!code) {
      setRefInfo({ status: "idle" });
      return;
    }

    let cancelled = false;

    setRefInfo({ status: "checking" });

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/referrals/validate/${encodeURIComponent(code)}`
        );

        if (cancelled) return;

        setRefInfo(
          data.valid
            ? {
                status: "valid",
                name: data.referrerName,
              }
            : { status: "invalid" }
        );
      } catch {
        if (!cancelled) {
          // A network/server error is not proof that the code is invalid.
          setRefInfo({ status: "idle" });
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refValue]);

  const onSubmit = async (formData) => {
    const referralCode = (formData.referralCode || "")
      .trim()
      .toUpperCase();

    if (refInfo.status === "invalid" && referralCode) {
      return toast.error(
        "Referral code is invalid. Fix it or clear the field."
      );
    }

    try {
      await signUp({
        ...formData,
        referralCode,
      });

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (e) {
      toast.error(
        e.code === "auth/email-already-in-use"
          ? "Email already registered"
          : "Could not create account"
      );
    }
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create Account"
      subtitle="Join thousands of users earning daily"
      maxW="max-w-lg"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <Input
          label="Full Name"
          icon={User}
          placeholder="Enter your full name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <Input
          label="Email Address"
          icon={Mail}
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            icon={Lock}
            type="password"
            placeholder="Create password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Input
            label="Confirm Password"
            icon={Lock}
            type="password"
            placeholder="Confirm password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        <Input
          label="Mobile Number"
          icon={Phone}
          type="tel"
          placeholder="+92xxxxxxxxxx"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Country
          </label>

          <select
            {...register("country")}
            className="h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none focus:border-brand-500"
          >
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          {errors.country && (
            <p className="mt-1.5 text-xs text-red-400">
              {errors.country.message}
            </p>
          )}
        </div>

        {/* Referral Code */}
        {showRef ? (
          <div>
            <Input
              label="Referral Code"
              placeholder="Enter referral code"
              error={errors.referralCode?.message}
              {...register("referralCode")}
            />

            {refInfo.status === "checking" && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Checking referral code...
              </p>
            )}

            {refInfo.status === "valid" && (
              <p className="mt-1.5 break-words text-xs text-brand-400">
                ✓ You were invited by {refInfo.name || "your referrer"}
              </p>
            )}

            {refInfo.status === "invalid" && (
              <p className="mt-1.5 text-xs text-red-400">
                Invalid referral code
              </p>
            )}

            {refInfo.status === "idle" && refValue?.trim() && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Referral code could not be verified right now.
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRef(true)}
            className="text-sm text-brand-400 hover:underline"
          >
            Have a referral code?
          </button>
        )}

        {/* Terms and Privacy */}
        <div>
          <label className="flex items-start gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              {...register("terms")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-green-500"
            />

            <span>
              I agree to the{" "}
              <a href="/terms" className="text-brand-400 underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-brand-400 underline">
                Privacy Policy
              </a>
            </span>
          </label>

          {errors.terms && (
            <p className="mt-1.5 text-xs text-red-400">
              {errors.terms.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || refInfo.status === "checking"}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 font-display font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            "Creating..."
          ) : (
            <>
              Create Account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

