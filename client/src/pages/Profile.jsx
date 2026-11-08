import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { User, Mail, Phone, Camera, Save, Shield, Lock, LogOut, Copy, Trash2, Loader2 } from "lucide-react";
import api from "../services/api";
import Avatar from "../components/ui/Avatar";
import Input from "../components/ui/Input";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { useAuth } from "../context/AuthContext";
import { profileSchema } from "../utils/validators";
import { squareResize } from "../utils/image";
import { COUNTRIES } from "../config/countries";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW = 10 * 1024 * 1024;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-0 last:pb-0 first:pt-0">
      <span className="text-sm text-zinc-400 sm:!text-zinc-400 ">{label}</span>
      <span className="text-sm font-medium text-white sm:!text-zinc-400 ">{children}</span>
    </div>
  );
}

export default function Profile() {
  const { reload } = useOutletContext();
  const { user, refreshUser, logout, resetPassword } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [p, setP] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } =
    useForm({ resolver: zodResolver(profileSchema) });

  const hasPassword = user?.providerData?.some((x) => x.providerId === "password");

  useEffect(() => {
    api.get("/profile")
      .then(({ data }) => {
        setP(data.profile);
        reset({ fullName: data.profile.fullName, phone: data.profile.phone, country: data.profile.country });
      })
      .catch((e) => toast.error(e.response?.data?.message || "Could not load your profile"));
  }, [reset]);

  const onSave = async (values) => {
    try {
      const { data } = await api.patch("/profile", values);
      setP(data.profile);
      reset({ fullName: data.profile.fullName, phone: data.profile.phone, country: data.profile.country });
      await refreshUser();
      reload();
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save changes");
    }
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";               // lets you pick the same file again later
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Only JPG, PNG or WEBP images are allowed");
    if (file.size > MAX_RAW) return toast.error("Image must be under 10 MB");

    setUploading(true);
    try {
      let blob;
      try { blob = await squareResize(file); }
      catch { return toast.error("This image could not be read. Try another one."); }

      const fd = new FormData();
      fd.append("avatar", blob, "avatar.jpg");
      const { data } = await api.post("/profile/avatar", fd);
      setP((x) => ({ ...x, avatarUrl: data.avatarUrl, hasCustomAvatar: true }));
      reload();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not upload your photo");
    } finally {
      setUploading(false);
    }
  };

  const onRemovePhoto = async () => {
    if (!window.confirm("Remove your profile photo?")) return;
    setUploading(true);
    try {
      const { data } = await api.delete("/profile/avatar");
      setP((x) => ({ ...x, avatarUrl: data.avatarUrl, hasCustomAvatar: false }));
      reload();
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not remove your photo");
    } finally {
      setUploading(false);
    }
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(p.referralCode); toast.success("Referral code copied"); }
    catch { toast.error("Copy failed"); }
  };

  const sendResetLink = async () => {
    try { await resetPassword(user.email); toast.success("We emailed you a link to set a password"); }
    catch { toast.error("Could not send the email. Try again later."); }
  };

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  if (!p) return <div className="mx-auto h-96 max-w-4xl animate-pulse rounded-3xl bg-zinc-900" />;

  const countries = !p.country || COUNTRIES.includes(p.country) ? COUNTRIES : [p.country, ...COUNTRIES];

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Profile</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Manage your account settings</p>
      </div>

      {/* Details */}
      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex flex-col items-center gap-5 border-b border-line pb-6 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <Avatar src={p.avatarUrl} name={p.fullName || p.email} className="h-24 w-24 text-3xl sm:h-20 sm:w-20 sm:text-2xl" />
            {uploading && (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-black/60">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-surface bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60">
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickPhoto} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-white sm:text-2xl">{p.fullName || "Member"}</h2>
            <p className="truncate text-sm text-zinc-400 ">{p.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <span className="rounded-full bg-blue-500/15 px-3 py-0.5 text-xs font-medium text-blue-400">{p.role}</span>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="text-xs font-medium text-brand-400 hover:underline disabled:opacity-60">Upload photo</button>
              {p.hasCustomAvatar && (
                <button onClick={onRemovePhoto} disabled={uploading}
                  className="flex items-center gap-1 text-xs font-medium text-red-400 hover:underline disabled:opacity-60">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">JPG, PNG or WEBP · it will be cropped to a square</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-5" noValidate>
          <Input label="Full Name" icon={User} placeholder="Enter your full name"
            error={errors.fullName?.message} {...register("fullName")} />

          <div>
            <div className="opacity-60">
              <Input label="Email Address" icon={Mail} value={p.email} readOnly disabled />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">Email cannot be changed</p>
          </div>

          <Input label="Mobile Number" icon={Phone} placeholder="+92xxxxxxxxxx"
            error={errors.phone?.message} {...register("phone")} />

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">Country</label>
            <select {...register("country")}
              className="h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none [color-scheme:dark] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.country && <p className="mt-1.5 text-xs text-red-400">{errors.country.message}</p>}
          </div>

          <button disabled={!isDirty || isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            <Save className="h-4 w-4" /> {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Account info */}
      <section className="rounded-3xl border border-line  bg-surface p-4 sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-white">
          <Shield className="h-5 w-5 text-brand-400" /> Account Information
        </h2>
        <Row label="Referral Code">
          <button onClick={copyCode} title="Copy" className="flex items-center  gap-2 font-mono hover:text-brand-400">
            {p.referralCode} <Copy className="h-3.5 w-3.5 text-zinc-500 " />
          </button>
        </Row>
        <Row label="Account Status">
          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${
            p.status === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
            {p.status}
          </span>
        </Row>
        <Row label="Member Since">{fmtDate(p.createdAt)}</Row>
      </section>






      {/* Security */}
      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-white">
          <Lock className="h-5 w-5 text-brand-400" /> Security
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-white">Password</p>
            <p className="text-sm text-zinc-400">
              {hasPassword ? "Change your account password" : "You signed in with Google. Email yourself a link to set a password."}
            </p>
          </div>
          <button onClick={hasPassword ? () => setPwOpen(true) : sendResetLink}
            className="rounded-xl border border-line bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
            {hasPassword ? "Change" : "Email me a link"}
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-red-500/20 bg-surface p-4 sm:p-6">
        <h2 className="mb-5 font-display text-lg font-semibold text-red-400">Danger Zone</h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium text-white">Sign Out</p>
            <p className="text-sm text-zinc-400">Sign out from your account</p>
          </div>
          <button onClick={signOut}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 hover:bg-red-500">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </section>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}
