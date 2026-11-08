// import { useEffect, useMemo, useRef, useState } from "react";
// import { Link, useNavigate, useParams } from "react-router-dom";
// import { ArrowLeft, Copy, UploadCloud, ListChecks, CheckCircle2, Lock, X, Clock } from "lucide-react";
// import toast from "react-hot-toast";
// import api from "../services/api";
// import { money } from "../utils/format";
// import MethodLogo from "../components/ui/MethodLogo";

// const MAX = 4 * 1024 * 1024;
// const TYPES = ["image/jpeg", "image/png", "image/webp"];

// const newReference = () =>
//   Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36).toUpperCase().padStart(2, "0")).join("");

// function CopyRow({ label, value }) {
//   const copy = async () => {
//     try { await navigator.clipboard.writeText(value); toast.success(`${label} copied`); }
//     catch { toast.error("Copy failed"); }
//   };
//   return (
//     <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
//       <div className="min-w-0">
//         <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
//         <p className="truncate font-display text-base font-bold text-white sm:text-lg">{value}</p>
//       </div>
//       <button onClick={copy} aria-label={`Copy ${label}`}
//         className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400 hover:bg-brand-500/25">
//         <Copy className="h-4 w-4" />
//       </button>
//     </div>
//   );
// }

// export default function Checkout() {
//   const { planId, methodId } = useParams();
//   const navigate = useNavigate();
//   const fileInput = useRef(null);
//   const reference = useMemo(newReference, []);

//   const [plan, setPlan] = useState(null);
//   const [method, setMethod] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [file, setFile] = useState(null);
//   const [preview, setPreview] = useState("");
//   const [txn, setTxn] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [done, setDone] = useState(false);
//   const [drag, setDrag] = useState(false);

//   useEffect(() => {
//     Promise.all([api.get("/plans"), api.get("/plans/methods")])
//       .then(([p, m]) => {
//         setPlan(p.data.plans.find((x) => x.id === planId) || null);
//         setMethod(m.data.methods.find((x) => x.id === methodId) || null);
//       })
//       .catch(() => toast.error("Could not load payment details"))
//       .finally(() => setLoading(false));
//   }, [planId, methodId]);

//   useEffect(() => {
//     if (!file) { setPreview(""); return; }
//     const url = URL.createObjectURL(file);
//     setPreview(url);
//     return () => URL.revokeObjectURL(url);
//   }, [file]);

//   const pick = (f) => {
//     if (!f) return;
//     if (!TYPES.includes(f.type)) return toast.error("Only JPG, PNG or WEBP images are allowed");
//     if (f.size > MAX) return toast.error("Screenshot must be under 4 MB");
//     setFile(f);
//   };

//   const submit = async () => {
//     const t = txn.trim().toUpperCase();
//     if (!file) return toast.error("Please upload your payment screenshot");
//     if (!/^[A-Z0-9]{6,30}$/.test(t)) return toast.error("Enter a valid transaction ID (letters and numbers only)");

//     const fd = new FormData();
//     fd.append("planId", plan.id);
//     fd.append("methodId", method.id);
//     fd.append("reference", reference);
//     fd.append("transactionId", t);
//     fd.append("screenshot", file);

//     setSubmitting(true);
//     try {
//       await api.post("/deposits", fd);
//       setDone(true);
//     } catch (e) {
//       toast.error(e.response?.data?.message || "Could not submit your payment. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading) return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-3xl bg-zinc-900" />;

//   if (!plan || !method) {
//     return (
//       <div className="mx-auto max-w-md py-16 text-center">
//         <p className="text-zinc-400">This payment page is not available.</p>
//         <Link to="/plans" className="mt-4 inline-block text-brand-400 hover:underline">Back to plans</Link>
//       </div>
//     );
//   }

//   if (done) {
//     return (
//       <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6 text-center sm:p-10">
//         <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-brand-500/15 text-brand-400">
//           <Clock className="h-8 w-8" />
//         </div>
//         <h1 className="font-display text-2xl font-bold text-white">Payment Submitted</h1>
//         <p className="mt-3 text-sm text-zinc-400">
//           We received your payment proof for <span className="text-white">{plan.name}</span> ({money(plan.price)}).
//           Your plan will be activated as soon as the payment is verified, usually within 24 hours.
//         </p>
//         <p className="mt-4 text-xs text-zinc-500">Order reference: {reference}</p>
//         <div className="mt-6 flex flex-col gap-3 sm:flex-row">
//           <button onClick={() => navigate("/deposits")} className="h-12 flex-1 rounded-xl bg-brand-500 font-semibold text-white hover:bg-brand-600">View my deposits</button>
//           <button onClick={() => navigate("/dashboard")} className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Go to dashboard</button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="mx-auto max-w-2xl space-y-5">
//       <div className="flex items-center gap-4">
//         <Link to="/plans" aria-label="Back" className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white hover:bg-zinc-800">
//           <ArrowLeft className="h-5 w-5" />
//         </Link>
//         <div>
//           <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">EarnNest</p>
//           <h1 className="font-display text-xl font-bold text-white sm:text-2xl">Confirm Deposit</h1>
//         </div>
//       </div>

//       <div className="space-y-5 rounded-3xl border border-line bg-surface p-4 sm:p-6">
//         <div className="flex items-center gap-4">
//           <MethodLogo method={method} size="h-16 w-16" />
//           <div>
//             <p className="font-display text-xl font-bold uppercase text-white">{method.name}</p>
//             <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Manual deposit</p>
//           </div>
//         </div>

//         <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-field p-4">
//           <div className="min-w-0">
//             <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Payable amount</p>
//             <p className="mt-1 truncate text-[11px] uppercase tracking-wider text-zinc-500">{plan.name} · Ref: {reference}</p>
//           </div>
//           <p className="shrink-0 font-display text-xl font-bold text-white sm:text-2xl">{plan.price.toLocaleString("en-PK", { minimumFractionDigits: 2 })} PKR</p>
//         </div>

//         <div className="rounded-2xl border border-line border-l-4 border-l-brand-500 bg-field p-4">
//           <p className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-white">
//             <ListChecks className="h-4 w-4" /> Follow steps
//           </p>
//           <div className="divide-y divide-line">
//             <CopyRow label="Account name" value={method.accountName} />
//             <CopyRow label="Account number" value={method.accountNumber} />
//           </div>
//           <p className="mt-4 text-xs text-zinc-500">
//             Send exactly {money(plan.price)} to this account, then upload the receipt and enter the transaction ID below.
//           </p>
          
//         </div>

//         <div>
//           <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-300">Screenshot</p>
//           <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
//             onChange={(e) => pick(e.target.files?.[0])} />
//           {preview ? (
//             <div className="relative overflow-hidden rounded-2xl border border-line bg-field p-3">
//               <img src={preview} alt="Payment receipt" className="mx-auto max-h-80 rounded-xl object-contain" />
//               <button onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }} aria-label="Remove screenshot"
//                 className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black">
//                 <X className="h-4 w-4" />
//               </button>
//             </div>
//           ) : (
//             <button type="button" onClick={() => fileInput.current?.click()}
//               onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
//               onDragLeave={() => setDrag(false)}
//               onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
//               className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
//                 drag ? "border-brand-400 bg-brand-500/10" : "border-brand-500/40 bg-field hover:border-brand-400"
//               }`}>
//               <UploadCloud className="h-9 w-9 text-brand-400" />
//               <span className="text-sm font-bold uppercase text-white">Upload payment screenshot</span>
//               <span className="text-xs text-zinc-500">Tap here to choose your payment proof · JPG, PNG, WEBP · Max 4 MB</span>
//             </button>
//           )}
//         </div>

//         <div>
//           <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-300">Transaction ID</label>
//           <input value={txn} onChange={(e) => setTxn(e.target.value)} maxLength={30} placeholder="Enter the transaction ID from your receipt"
//             className="h-12 w-full rounded-xl border border-line bg-field px-4 text-sm uppercase text-white outline-none placeholder:normal-case placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
//         </div>

//         <button onClick={submit} disabled={submitting}
//           className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-bold uppercase text-white shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-60">
//           <CheckCircle2 className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit & confirm the payment"}
//         </button>
//         <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
//           <Lock className="h-3 w-3 text-brand-400" /> Secure transaction
//         </p>
//       </div>
//     </div>
//   );
// }

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, UploadCloud, ListChecks, CheckCircle2, Lock, X, Clock } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { money } from "../utils/format";
import MethodLogo from "../components/ui/MethodLogo";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const newReference = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36).toUpperCase().padStart(2, "0")).join("");

function CopyRow({ label, value }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="truncate font-display text-base font-bold text-white sm:text-lg">{value}</p>
      </div>

      <button
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400 hover:bg-brand-500/25"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Checkout() {
  const { planId, methodId } = useParams();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const reference = useMemo(newReference, []);

  const [plan, setPlan] = useState(null);
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [txn, setTxn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/plans"), api.get("/plans/methods")])
      .then(([p, m]) => {
        setPlan(p.data.plans.find((x) => x.id === planId) || null);
        setMethod(m.data.methods.find((x) => x.id === methodId) || null);
      })
      .catch(() => toast.error("Could not load payment details"))
      .finally(() => setLoading(false));
  }, [planId, methodId]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) return toast.error("Only JPG, PNG or WEBP images are allowed");
    if (f.size > MAX) return toast.error("Screenshot must be under 4 MB");
    setFile(f);
  };

  const submit = async () => {
    const t = txn.trim().toUpperCase();

    if (!file) return toast.error("Please upload your payment screenshot");
    if (!/^[A-Z0-9]{6,30}$/.test(t)) {
      return toast.error("Enter a valid transaction ID (letters and numbers only)");
    }

    const fd = new FormData();
    fd.append("planId", plan.id);
    fd.append("methodId", method.id);
    fd.append("reference", reference);
    fd.append("transactionId", t);
    fd.append("screenshot", file);

    setSubmitting(true);

    try {
      await api.post("/deposits", fd);
      setDone(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not submit your payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-3xl bg-zinc-900" />;
  }

  if (!plan || !method) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-zinc-400">This payment page is not available.</p>
        <Link to="/plans" className="mt-4 inline-block text-brand-400 hover:underline">
          Back to plans
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-6 text-center sm:p-10">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-brand-500/15 text-brand-400">
          <Clock className="h-8 w-8" />
        </div>

        <h1 className="font-display text-2xl font-bold text-white">Payment Submitted</h1>

        <p className="mt-3 text-sm text-zinc-400">
          We received your payment proof for <span className="text-white">{plan.name}</span> ({money(plan.price)}).
          Your plan will be activated as soon as the payment is verified, usually within 24 hours.
        </p>

        <p className="mt-4 text-xs text-zinc-500">Order reference: {reference}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/deposits")}
            className="h-12 flex-1 rounded-xl bg-brand-500 font-semibold text-white hover:bg-brand-600"
          >
            View my deposits
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-4">
        <Link
          to="/plans"
          aria-label="Back"
          className="grid h-11 w-11 place-items-center rounded-xl border border-line text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">EarnNest</p>
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">Confirm Deposit</h1>
        </div>
      </div>

      <div className="space-y-5 rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <MethodLogo method={method} size="h-16 w-16" />

          <div>
            <p className="font-display text-xl font-bold uppercase text-white">{method.name}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Manual deposit</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-field p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Payable amount</p>
            <p className="mt-1 truncate text-[11px] uppercase tracking-wider text-zinc-500">
              {plan.name} · Ref: {reference}
            </p>
          </div>

          <p className="shrink-0 font-display text-xl font-bold text-white sm:text-2xl">
            {plan.price.toLocaleString("en-PK", { minimumFractionDigits: 2 })} PKR
          </p>
        </div>

        <div className="rounded-2xl border border-line border-l-4 border-l-brand-500 bg-field p-4">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold uppercase text-white">
            <ListChecks className="h-4 w-4" /> Follow steps
          </p>

          <div className="divide-y divide-line">
            <CopyRow label="Account name" value={method.accountName} />

            <CopyRow
              label={method.kind === "bank" ? "IBAN / Account number" : "Account number"}
              value={method.accountNumber}
            />
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Send exactly {money(plan.price)} to this account, then upload the receipt and enter the transaction ID below.
          </p>

          {method.instructions && (
            <p className="mt-3 rounded-xl bg-base/60 p-3 text-xs text-zinc-300">
              {method.instructions}
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-300">Screenshot</p>

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />

          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-line bg-field p-3">
              <img
                src={preview}
                alt="Payment receipt"
                className="mx-auto max-h-80 rounded-xl object-contain"
              />

              <button
                onClick={() => {
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                aria-label="Remove screenshot"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pick(e.dataTransfer.files?.[0]);
              }}
              className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
                drag
                  ? "border-brand-400 bg-brand-500/10"
                  : "border-brand-500/40 bg-field hover:border-brand-400"
              }`}
            >
              <UploadCloud className="h-9 w-9 text-brand-400" />

              <span className="text-sm font-bold uppercase text-white">
                Upload payment screenshot
              </span>

              <span className="text-xs text-zinc-500">
                Tap here to choose your payment proof · JPG, PNG, WEBP · Max 4 MB
              </span>
            </button>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-300">
            Transaction ID
          </label>

          <input
            value={txn}
            onChange={(e) => setTxn(e.target.value)}
            maxLength={30}
            placeholder="Enter the transaction ID from your receipt"
            className="h-12 w-full rounded-xl border border-line bg-field px-4 text-sm uppercase text-white outline-none placeholder:normal-case placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-bold uppercase text-white shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          {submitting ? "Submitting…" : "Submit & confirm the payment"}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          <Lock className="h-3 w-3 text-brand-400" /> Secure transaction
        </p>
      </div>
    </div>
  );
}

