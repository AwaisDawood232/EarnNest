import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowUpFromLine, Settings, X, Check, Loader2, Copy, Mail, Phone, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import { money } from "../../utils/format";

const TABS = [["pending", "Pending"], ["approved", "Paid"], ["rejected", "Rejected"], ["all", "All"]];
const BADGE = {
  pending: "bg-amber-500/10 text-amber-400",
  approved: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};
const LABEL = { pending: "pending", approved: "paid", rejected: "rejected" };
const REASONS = [
  "Account number or name is incorrect",
  "Suspicious activity. Please contact support",
  "Does not meet our withdrawal policy",
];
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

const copy = async (text, what) => {
  try { await navigator.clipboard.writeText(text); toast.success(`${what} copied`); }
  catch { toast.error("Copy failed"); }
};

function Row({ label, value, tone = "text-white" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
      <span className="text-zinc-400">{label}</span>
      <span className={`text-right font-medium ${tone}`}>{value}</span>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-field p-3">
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-green-500" />
    </label>
  );
}

function Num({ label, suffix, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      <div className="relative">
        <input type="number" min="0" step="any" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-base px-3 pr-10 text-sm text-white outline-none focus:border-brand-500" />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
}

/* ---------------- settings ---------------- */
function SettingsModal({ onClose }) {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/admin/withdrawals/settings")
      .then((r) => {
        const x = r.data.settings;
        setS({
          requirePlan: x.requirePlan,
          maxPending: String(x.maxPending),
          methods: Object.fromEntries(Object.entries(x.methods).map(([id, m]) => [id, { ...m, min: String(m.min), max: String(m.max), feePercent: String(m.feePercent) }])),
        });
      })
      .catch(() => { toast.error("Could not load settings"); onClose(); });
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const setMethod = (id, k) => (v) => setS((x) => ({ ...x, methods: { ...x.methods, [id]: { ...x.methods[id], [k]: v } } }));

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/admin/withdrawals/settings", {
        requirePlan: s.requirePlan,
        maxPending: Number(s.maxPending),
        methods: Object.fromEntries(Object.entries(s.methods).map(([id, m]) => [id, {
          enabled: m.enabled, min: Number(m.min), max: Number(m.max), feePercent: Number(m.feePercent || 0),
        }])),
      });
      toast.success("Withdrawal settings saved");
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save settings");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Withdrawal Settings</h2>
            <p className="mt-1 text-sm text-zinc-400">Changes apply to new requests immediately.</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        {!s ? <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div> : (
          <div className="space-y-4">
            {Object.entries(s.methods).map(([id, m]) => (
              <div key={id} className={`rounded-2xl border p-4 ${m.enabled ? "border-line bg-field" : "border-dashed border-zinc-700 bg-field opacity-70"}`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-white">{m.name}</p>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={m.enabled} onChange={(e) => setMethod(id, "enabled")(e.target.checked)} className="h-5 w-5 accent-green-500" />
                    {m.enabled ? "Enabled" : "Disabled"}
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Num label="Minimum" suffix="Rs" value={m.min} onChange={setMethod(id, "min")} />
                  <Num label="Maximum" suffix="Rs" value={m.max} onChange={setMethod(id, "max")} />
                  <Num label="Fee" suffix="%" value={m.feePercent} onChange={setMethod(id, "feePercent")} />
                </div>
              </div>
            ))}

            <Toggle label="Require a purchased plan" hint="Members with no plan cannot withdraw." checked={s.requirePlan} onChange={(v) => setS((x) => ({ ...x, requirePlan: v }))} />
            <div className="max-w-[12rem]">
              <Num label="Max pending requests per member" value={s.maxPending} onChange={(v) => setS((x) => ({ ...x, maxPending: v }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} disabled={busy} className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Cancel</button>
              <button onClick={save} disabled={busy} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- review ---------------- */
function ReviewModal({ item, onClose, onDone }) {
  const [d, setD] = useState(null);
  const [mode, setMode] = useState(null); // null | "approve" | "reject"
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = item.status === "pending";

  useEffect(() => {
    api.get(`/admin/withdrawals/${item.id}`)
      .then((r) => setD(r.data))
      .catch((e) => { toast.error(e.response?.data?.message || "Could not load details"); onClose(); });
  }, [item.id, onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const run = async (path, body, okMsg) => {
    setBusy(true);
    try {
      await api.post(`/admin/withdrawals/${item.id}/${path}`, body);
      toast.success(okMsg);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || "Action failed");
      setBusy(false);
    }
  };

  const s = d?.summary, m = d?.member;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-white">Withdrawal Request</h2>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* what to send */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Send money to</p>
              <p className="mt-1 font-display text-3xl font-bold text-white">{money(item.netAmount)}</p>
              {item.fee > 0 && <p className="text-xs text-zinc-400">Requested {money(item.amount)} − fee {money(item.fee)}</p>}

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-base/60 p-3">
                  <div className="min-w-0"><p className="text-xs text-zinc-500">{item.methodName} number</p><p className="truncate font-mono text-base font-bold text-white">{item.accountNumber}</p></div>
                  <button onClick={() => copy(item.accountNumber, "Number")} aria-label="Copy number" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400"><Copy className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-base/60 p-3">
                  <div className="min-w-0"><p className="text-xs text-zinc-500">Account name</p><p className="truncate text-base font-bold text-white">{item.accountName}</p></div>
                  <button onClick={() => copy(item.accountName, "Name")} aria-label="Copy name" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400"><Copy className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {d?.flags.nameMismatch && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> The account name does not match the member's registered name ({m.name}). Verify before paying.
              </p>
            )}
            {d && s.otherPending > 0 && (
              <p className="rounded-xl border border-line bg-field p-3 text-xs text-zinc-300">This member has another {money(s.otherPending)} pending.</p>
            )}

            {/* actions */}
            {pending ? (
              mode === "approve" ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-300">Send {money(item.netAmount)} from your {item.methodName} app first, then confirm.</p>
                  <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={40} placeholder="Payment reference / transaction ID (optional)"
                    className="h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500" />
                  <div className="flex gap-3">
                    <button onClick={() => setMode(null)} disabled={busy} className="h-12 flex-1 rounded-xl border border-line text-sm text-white hover:bg-zinc-800">Back</button>
                    <button onClick={() => run("approve", { paymentRef: ref }, "Marked as paid")} disabled={busy}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} I've sent it
                    </button>
                  </div>
                </div>
              ) : mode === "reject" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                      <button key={r} onClick={() => setReason(r)} className={`rounded-full border px-3 py-1 text-xs ${reason === r ? "border-red-500 bg-red-500/10 text-red-300" : "border-line text-zinc-400 hover:text-white"}`}>{r}</button>
                    ))}
                  </div>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} rows={3} placeholder="Reason shown to the member"
                    className="w-full rounded-xl border border-line bg-field p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-500" />
                  <p className="text-xs text-zinc-500">{money(item.amount)} will be returned to the member's wallet automatically.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setMode(null)} disabled={busy} className="h-12 flex-1 rounded-xl border border-line text-sm text-white hover:bg-zinc-800">Back</button>
                    <button onClick={() => run("reject", { reason }, "Request rejected. Amount refunded.")} disabled={busy || reason.trim().length < 3}
                      className="h-12 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{busy ? "Rejecting…" : "Confirm Reject"}</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setMode("reject")} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-sm font-semibold text-red-400 hover:bg-red-500/10"><X className="h-4 w-4" /> Reject</button>
                  <button onClick={() => setMode("approve")} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110"><Check className="h-4 w-4" /> Approve</button>
                </div>
              )
            ) : (
              <div className={`rounded-xl px-4 py-3 text-sm ${BADGE[item.status]}`}>
                <span className="font-semibold capitalize">{LABEL[item.status]}</span> · {fmt(item.reviewedAt)}
                {item.reason && <p className="mt-1 text-xs">{item.reason}</p>}
              </div>
            )}
          </div>

          {/* member details */}
          <div className="space-y-4">
            {!d ? <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div> : (
              <>
                <div className="rounded-2xl border border-line bg-field p-4">
                  <p className="font-display text-lg font-semibold text-white">{m.name}</p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span className="flex items-center gap-1 break-all"><Mail className="h-3 w-3" />{m.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Joined {fmt(m.joinedAt)} · {m.country} · {m.directReferrals} direct referrals</p>
                  {m.removed && <p className="mt-2 text-xs text-red-400">This member account was removed.</p>}
                </div>

                <div className="rounded-2xl border border-line bg-field px-4 py-2">
                  <Row label="Total payments in (approved)" value={money(s.totalIn)} tone="text-green-400" />
                  <Row label="Approved payments" value={`${s.approvedPayments}${s.pendingPayments ? ` (+${s.pendingPayments} pending)` : ""}`} />
                  <Row label="Active plans / invested" value={`${s.activePlans} · ${money(s.invested)}` } />
                  <Row label="Total earned" value={money(s.totalEarned)} />
                  <Row label="Paid out before" value={`${money(s.paidBefore)} (${s.withdrawalsCount})`} />
                  <Row label="Money in − payouts" value={money(s.net)} tone={s.net >= 0 ? "text-green-400" : "text-amber-400"} />
                  <Row label="Wallets now" value={`Earning ${money(m.wallets.earning)} · Referral ${money(m.wallets.referral)}`} />
                </div>

                {d.recent.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-white">Previous requests</p>
                    <ul className="space-y-2">
                      {d.recent.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-field p-3 text-xs">
                          <span className="text-zinc-300">{r.methodName} · {money(r.amount)} · {fmt(r.createdAt)}</span>
                          <span className={`rounded-full px-2 py-0.5 capitalize ${BADGE[r.status]}`}>{LABEL[r.status]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function AdminWithdrawals() {
  const { data, refreshNotif } = useOutletContext();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [open, setOpen] = useState(null);
  const [settings, setSettings] = useState(false);
  const closeReview = useCallback(() => setOpen(null), []);
  const closeSettings = useCallback(() => setSettings(false), []);

  const load = useCallback(() => {
    api.get("/admin/withdrawals", { params: { status: tab } })
      .then((r) => { setRows(r.data.withdrawals); setCounts(r.data.counts); })
      .catch((e) => toast.error(e.response?.data?.message || "Could not load requests"));
  }, [tab]);
  useEffect(() => { setRows(null); load(); }, [load]);

  if (data && data.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
            <ArrowUpFromLine className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Withdrawal Requests
          </h1>
          <p className="mt-1 text-sm text-zinc-400 ">Review, pay and manage withdrawals</p>
        </div>
        <button onClick={() => setSettings(true)} className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-white hover:bg-zinc-800">
          <Settings className="h-4 w-4" /> Settings
        </button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-brand-500 text-white" : "border border-line bg-surface text-zinc-400 hover:text-white"}`}>
            {label} <span className="ml-1 opacity-70">{counts[key] ?? ""}</span>
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        {!rows ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-zinc-400">No {tab === "all" ? "" : LABEL[tab]} requests</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((w) => (
              <li key={w.id}>
                <button onClick={() => setOpen(w)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-field p-3 text-left transition hover:border-brand-500/40 sm:p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{w.customerName} · {money(w.amount)}</p>
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span>{w.methodName} · {w.accountNumber}</span>
                      <span>{w.email}</span>
                      <span>{fmt(w.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${BADGE[w.status]}`}>{LABEL[w.status]}</span>
                    <span className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white">{w.status === "pending" ? "Review" : "View"}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && <ReviewModal item={open} onClose={closeReview} onDone={() => { setOpen(null); load(); refreshNotif?.(); }} />}
      {settings && <SettingsModal onClose={closeSettings} />}
    </div>
  );
}

