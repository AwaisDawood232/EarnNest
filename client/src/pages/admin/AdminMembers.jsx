import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users, Search, X, Loader2, Mail, Phone, UserCheck, UserX, Ban, Layers,
  Banknote, TrendingUp, Hourglass, Scale, Trash2, ShieldAlert,
} from "lucide-react";
import api from "../../services/api";
import Avatar from "../../components/ui/Avatar";
import { money } from "../../utils/format";

const TABS = [["all", "All"], ["active", "With active plan"], ["inactive", "No active plan"], ["suspended", "Suspended"]];
const PAGE = 30;
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const BADGE = {
  active: "bg-green-500/10 text-green-400",
  completed: "bg-blue-500/10 text-blue-400",
  cancelled: "bg-zinc-700 text-zinc-300",
  pending: "bg-amber-500/10 text-amber-400",
  approved: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
  suspended: "bg-red-500/10 text-red-400",
};
const Badge = ({ s }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${BADGE[s] || BADGE.cancelled}`}>{s}</span>
);

function Tile({ icon: Icon, label, value, tone = "text-white", box = "bg-zinc-800 text-zinc-300" }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${box}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="truncate text-xs text-zinc-400">{label}</p>
        <p className={`truncate font-display  font-bold sm:text-xl ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-field p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MemberModal({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [mode, setMode] = useState(null); // null | "suspend" | "delete"
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/admin/members/${id}`)
      .then((r) => setD(r.data))
      .catch((e) => { toast.error(e.response?.data?.message || "Could not load member"); onClose(); });
  }, [id, onClose]);
  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const run = async (fn, okMsg, closeAfter) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      onChanged();
      if (closeAfter) return onClose();
      setMode(null); setReason(""); load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Action failed");
    } finally { setBusy(false); }
  };

  const m = d?.member;
  const suspended = m?.status === "suspended";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 sm:rounded-3xl sm:p-6">
        {!d ? (
          <div className="grid h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-zinc-500" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={m.avatarUrl} name={m.name} className="h-14 w-14 text-lg" />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold text-white sm:text-xl">{m.name}</h2>
                  <p className="truncate text-sm text-zinc-400">{m.email}</p>
                  <div className="mt-1"><Badge s={m.status} /></div>
                </div>
              </div>
              <button onClick={onClose} disabled={busy} aria-label="Close"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>

            {suspended && m.suspendReason && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">Suspended: {m.suspendReason}</p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Mini label="Phone" value={m.phone || "—"} />
              <Mini label="Country" value={m.country || "—"} />
              <Mini label="Joined" value={fmt(m.createdAt)} />
              <Mini label="Referral code" value={m.referralCode || "—"} />
              <Mini label="Referred by" value={m.referredByName || "—"} />
              <Mini label="Direct referrals" value={m.directReferrals} />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini label="Deposit wallet" value={money(m.wallets.deposit)} />
              <Mini label="Earning wallet" value={money(m.wallets.earning)} />
              <Mini label="Referral wallet" value={money(m.wallets.referral)} />
              <Mini label="Rewards wallet" value={money(m.wallets.rewards)} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 font-display text-base font-semibold text-white">Plan history ({d.plans.length})</h3>
                {d.plans.length === 0 ? <p className="text-sm text-zinc-500">No plans purchased.</p> : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {d.plans.map((p) => (
                      <li key={p.id} className="rounded-xl border border-line bg-field p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-white">{p.name} · {money(p.amount)}</span><Badge s={p.status} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">{fmt(p.date)} · {p.daysPaid}/{p.durationDays} days · earned {money(p.earned)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-display text-base font-semibold text-white">Payments ({d.deposits.length})</h3>
                {d.deposits.length === 0 ? <p className="text-sm text-zinc-500">No payments submitted.</p> : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {d.deposits.map((x) => (
                      <li key={x.id} className="rounded-xl border border-line bg-field p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-white">{x.planName} · {money(x.amount)}</span><Badge s={x.status} />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">{fmt(x.date)} · {x.methodName}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* actions */}
            <div className="border-t border-line pt-5">
              {mode ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    {mode === "suspend" ? "Suspend this member" : "Permanently remove this member"}
                  </p>
                  {mode === "delete" && (
                    <p className="text-xs text-zinc-400">
                      Their login and profile are deleted, running plans are cancelled and pending payments are rejected. This cannot be undone.
                    </p>
                  )}
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} rows={3}
                    placeholder="Reason (e.g. Violated our terms of service)"
                    className="w-full rounded-xl border border-line bg-field p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-500" />
                  <div className="flex gap-3">
                    <button onClick={() => { setMode(null); setReason(""); }} disabled={busy}
                      className="h-12 flex-1 rounded-xl border border-line text-sm text-white hover:bg-zinc-800">Back</button>
                    <button disabled={busy || reason.trim().length < 3}
                      onClick={() => mode === "suspend"
                        ? run(() => api.post(`/admin/members/${id}/suspend`, { suspend: true, reason }), "Member suspended")
                        : window.confirm(`Permanently remove ${m.name}? This cannot be undone.`) &&
                          run(() => api.delete(`/admin/members/${id}`, { data: { reason } }), "Member removed", true)}
                      className="h-12 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                      {busy ? "Please wait…" : mode === "suspend" ? "Confirm Suspend" : "Confirm Remove"}
                    </button>
                  </div>
                </div>
              ) : m.role === "admin" ? (
                <p className="text-sm text-zinc-500">Admin accounts cannot be changed here.</p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {suspended ? (
                    <button disabled={busy}
                      onClick={() => run(() => api.post(`/admin/members/${id}/suspend`, { suspend: false }), "Member reactivated")}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                      <UserCheck className="h-4 w-4" /> Reactivate
                    </button>
                  ) : (
                    <button onClick={() => setMode("suspend")}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/40 text-sm font-semibold text-amber-400 hover:bg-amber-500/10">
                      <Ban className="h-4 w-4" /> Suspend
                    </button>
                  )}
                  <button onClick={() => setMode("delete")}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-sm font-semibold text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" /> Remove permanently
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminMembers() {
  const { data } = useOutletContext();
  const [res, setRes] = useState(null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/members")
      .then((r) => setRes(r.data))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load members"));
  }, []);
  useEffect(load, [load]);
  useEffect(() => setLimit(PAGE), [tab, q]);

  const counts = useMemo(() => {
    const m = res?.members || [];
    return {
      all: m.length,
      active: m.filter((x) => x.activePlans > 0).length,
      inactive: m.filter((x) => x.activePlans === 0).length,
      suspended: m.filter((x) => x.status === "suspended").length,
    };
  }, [res]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (res?.members || []).filter((x) => {
      if (tab === "active" && x.activePlans === 0) return false;
      if (tab === "inactive" && x.activePlans > 0) return false;
      if (tab === "suspended" && x.status !== "suspended") return false;
      return !term || [x.name, x.email, x.phone].some((v) => v.toLowerCase().includes(term));
    });
  }, [res, tab, q]);

  const closeModal = useCallback(() => setOpen(null), []);

  if (data && data.user.role !== "admin") return <Navigate to="/dashboard" replace />;
  const s = res?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
          <Users className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Members
        </h1>
        <p className="mt-1 text-sm text-zinc-400 ">Everyone registered on the platform, their plans and your earnings</p>
      </div>

      {!s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[...Array(8)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={Users} label="Total Members" value={s.totalMembers} box="bg-blue-500/10 text-blue-400" />
            <Tile icon={UserCheck} label="With Active Plan" value={s.activeMembers} tone="text-green-400" box="bg-green-500/10 text-green-400" />
            <Tile icon={UserX} label="No Active Plan" value={s.inactiveMembers} tone="text-amber-400" box="bg-amber-500/10 text-amber-400" />
            <Tile icon={Ban} label="Suspended" value={s.suspended} tone="text-red-400" box="bg-red-500/10 text-red-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={Banknote} label="Total Revenue (approved)" value={money(s.revenue)} tone="text-green-400" box="bg-green-500/10 text-green-400" />
            <Tile icon={Layers} label={`Active Plans (${s.activePlans})`} value={money(s.activePlanValue)} box="bg-purple-500/10 text-purple-400" />
            <Tile icon={TrendingUp} label="Rewards Paid Out" value={money(s.rewardsPaid)} box="bg-blue-500/10 text-blue-400" />
            <Tile icon={Hourglass} label="Remaining Payouts" value={money(s.remainingPayouts)} tone="text-amber-400" box="bg-amber-500/10 text-amber-400" />
          </div>
          <Tile icon={Scale} label="Revenue − Rewards Paid" value={money(s.net)} tone={s.net >= 0 ? "text-green-400" : "text-red-400"} box="bg-zinc-800 text-zinc-300" />
        </>
      )}

      <section className="space-y-4 rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone"
            className="h-12 w-full rounded-xl border border-line bg-field pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-brand-500 text-white" : "border border-line text-zinc-400 hover:text-white"}`}>
              {label} <span className="ml-1 opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>

        {!res ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-zinc-400">No members found</p>
        ) : (
          <>
            <ul className="space-y-3">
              {rows.slice(0, limit).map((m) => (
                <li key={m.id}>
                  <button onClick={() => setOpen(m.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-field p-3 text-left transition hover:border-brand-500/40 sm:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={m.avatarUrl} name={m.name} className="h-11 w-11 text-sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{m.name}</p>
                        <p className="flex flex-wrap gap-x-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1 break-all"><Mail className="h-3 w-3" />{m.email}</span>
                          {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                          <span>Joined {fmt(m.createdAt)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {m.status === "suspended" && <Badge s="suspended" />}
                      <span className={`rounded-full px-2.5 py-0.5 font-medium ${m.activePlans > 0 ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
                        {m.activePlans > 0 ? `${m.activePlans} active plan${m.activePlans > 1 ? "s" : ""}` : "No active plan"}
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-zinc-300">Invested {money(m.invested)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {rows.length > limit && (
              <button onClick={() => setLimit((n) => n + PAGE)}
                className="h-11 w-full rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">
                Show more ({rows.length - limit} remaining)
              </button>
            )}
          </>
        )}
      </section>

      {open && <MemberModal id={open} onClose={closeModal} onChanged={load} />}
    </div>
  );
}