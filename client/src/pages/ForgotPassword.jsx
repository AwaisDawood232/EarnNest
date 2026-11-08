import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/ui/Input";
import { forgotSchema } from "../utils/validators";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async ({ email }) => {
    try { await resetPassword(email); } catch {}
    toast.success("If that email exists, a reset link has been sent."); // same message either way (prevents account enumeration)
  };

  return (
    <AuthLayout icon={KeyRound} title="Forgot password?" subtitle="Enter your email and we'll send a reset link">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input label="Email Address" icon={Mail} placeholder="Enter your email" error={errors.email?.message} {...register("email")} />
        <button disabled={isSubmitting} className="h-12 w-full rounded-xl bg-brand-500 font-semibold text-white hover:bg-brand-600 disabled:opacity-60">Send reset link</button>
        <p className="text-center text-sm"><Link to="/login" className="text-brand-400 hover:underline">Back to sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
