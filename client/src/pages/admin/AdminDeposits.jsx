import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, Eye, Check, X, Loader2, Mail, Phone, ImageOff } from "lucide-react";
import api from "../../services/api";
import { money } from "../../utils/format";

const TABS = [["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"]];
const BADGE = {
  pending: "bg-amber-500/10 text-amber-400",
  approved: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};
const REASONS = [
  "Payment not received in our account",
  "Amount does not match the plan price",
  "Transaction ID does not match the screenshot",
  "Screenshot is unclear or invalid",
];
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

function Receipt({ id }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    api.get(`/admin/deposits/${id}/receipt`, { responseType: "blob" })
      .then((r) => { if (alive) { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl); } })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);

  if (failed) return <div className="grid h-64 place-items-center rounded-2xl bg-field text-zinc-500"><ImageOff className="h-8 w-8" /></div>;
  if (!url) return <div className="grid h-64 place-items-center rounded-2xl bg-field"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open full size">
      <img src={url} alt="Payment receipt" className="max-h-[60dvh] w-full rounded-2xl bg-field object-contain" />
    </a>
  );
}

function Field({ label, children, mono }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-0.5 break-all text-sm text-white ${mono ? "font-mono" : ""}`}>{children}</p>
    </div>
  );
}

function ReviewModal({ item, onClose, onDone }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = item.status === "pending";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const run = async (path, body, okMsg) => {
    setBusy(true);
    try {
      await api.post(`/admin/deposits/${item.id}/${path}`, body);
      toast.success(okMsg);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || "Action failed");
      setBusy(false);
    }
  };

  const onApprove = () => {
    if (window.confirm(`Confirm that ${money(item.amount)} (ID ${item.transactionId}) is in your account?\nThis activates the plan and pays referral bonuses.`)) {
      run("approve", {}, "Payment approved. Plan activated.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-white">Review Payment</h2>
          <button onClick={onClose} disabled={busy} aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Receipt id={item.id} />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-field p-4">
              <Field label="Customer">{item.customerName}</Field>
              <Field label="Phone">{item.phone}</Field>
              <div className="col-span-2"><Field label="Email">{item.email}</Field></div>
              <Field label="Plan">{item.planName}</Field>
              <Field label="Amount to verify"><span className="font-bold text-brand-400">{money(item.amount)}</span></Field>
              <Field label="Method">{item.methodName}</Field>
              <Field label="Submitted">{fmt(item.createdAt)}</Field>
              <div className="col-span-2"><Field label="Transaction ID" mono>{item.transactionId}</Field></div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-zinc-300">
              <p className="mb-2 font-semibold text-amber-400">Before approving, confirm:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>The money is in your {item.methodName} account with this transaction ID</li>
                <li>The amount is exactly {money(item.amount)}</li>
                <li>The screenshot shows payment to your account number</li>
                <li>The transaction ID matches the screenshot</li>
              </ul>
            </div>

            {pending ? (
              rejecting ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                      <button key={r} onClick={() => setReason(r)}
                        className={`rounded-full border px-3 py-1 text-xs ${reason === r ? "border-red-500 bg-red-500/10 text-red-300" : "border-line text-zinc-400 hover:text-white"}`}>{r}</button>
                    ))}
                  </div>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} rows={3}
                    placeholder="Reason shown to the customer"
                    className="w-full rounded-xl border border-line bg-field p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-500" />
                  <div className="flex gap-3">
                    <button onClick={() => setRejecting(false)} disabled={busy}
                      className="h-12 flex-1 rounded-xl border border-line text-sm text-white hover:bg-zinc-800">Back</button>
                    <button onClick={() => run("reject", { reason }, "Payment rejected")} disabled={busy || reason.trim().length < 3}
                      className="h-12 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                      {busy ? "Rejecting…" : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setRejecting(true)} disabled={busy}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-sm font-semibold text-red-400 hover:bg-red-500/10">
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button onClick={onApprove} disabled={busy}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-60">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                  </button>
                </div>
              )
            ) : (
              <div className={`rounded-xl px-4 py-3 text-sm ${BADGE[item.status]}`}>
                <span className="font-semibold capitalize">{item.status}</span> · {fmt(item.reviewedAt)}
                {item.reason && <p className="mt-1 text-xs">{item.reason}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDeposits() {
  const { data } = useOutletContext();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/deposits", { params: { status: tab } })
      .then((r) => { setRows(r.data.deposits); setCounts(r.data.counts); })
      .catch((e) => toast.error(e.response?.data?.message || "Could not load payments"));
  }, [tab]);

  useEffect(() => { setRows(null); load(); }, [load]);

  if (data && data.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
          <ShieldCheck className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Review Payments
        </h1>
        <p className="mt-1 text-sm text-zinc-400 ">Verify customer payments, then approve or reject them</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-brand-500 text-white" : "border border-line bg-surface text-zinc-400 hover:text-white"}`}>
            {label} <span className="ml-1 opacity-70">{counts[key] ?? ""}</span>
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        {!rows ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-zinc-400">No {tab === "all" ? "" : tab} payments</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-field p-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">{d.customerName} · {d.planName} · {money(d.amount)}</p>
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{d.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span>
                    <span>{d.methodName} · {d.transactionId}</span>
                    <span>{fmt(d.createdAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${BADGE[d.status]}`}>{d.status}</span>
                  <button onClick={() => setOpen(d)}
                    className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                    <Eye className="h-4 w-4" /> {d.status === "pending" ? "Review" : "View"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && <ReviewModal item={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load(); }} />}
    </div>
  );
}

