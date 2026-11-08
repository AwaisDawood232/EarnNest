import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Lock } from "lucide-react";
import toast from "react-hot-toast";
import Input from "./ui/Input";
import { passwordSchema } from "../utils/validators";
import { useAuth } from "../context/AuthContext";

const ERRORS = {
  "auth/invalid-credential": "Your current password is incorrect",
  "auth/wrong-password": "Your current password is incorrect",
  "auth/weak-password": "Choose a stronger password",
  "auth/too-many-requests": "Too many attempts. Try again later",
  "auth/requires-recent-login": "Please sign out, sign in again, and retry",
};

export default function ChangePasswordModal({ onClose }) {
  const { changePassword } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully");
      onClose();
    } catch (e) {
      toast.error(ERRORS[e.code] || "Could not update your password");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Change Password</h2>
            <p className="mt-1 text-sm text-zinc-400">Use at least 8 characters with upper, lower case and a number.</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Current Password" icon={Lock} type="password" placeholder="Enter current password"
            error={errors.currentPassword?.message} {...register("currentPassword")} />
          <Input label="New Password" icon={Lock} type="password" placeholder="Enter new password"
            error={errors.newPassword?.message} {...register("newPassword")} />
          <Input label="Confirm New Password" icon={Lock} type="password" placeholder="Confirm new password"
            error={errors.confirmPassword?.message} {...register("confirmPassword")} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Cancel</button>
            <button disabled={isSubmitting}
              className="h-12 flex-1 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
              {isSubmitting ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
