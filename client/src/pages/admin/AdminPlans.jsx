import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { SlidersHorizontal, Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2 } from "lucide-react";
import api from "../../services/api";
import { money } from "../../utils/format";

const EMPTY = { name: "", price: "", dailyProfit: "", durationDays: "85", popular: false, active: true };

const calc = (f) => {
  const price = Number(f.price), daily = Number(f.dailyProfit), days = Number(f.durationDays);
  const total = daily * days;
  return {
    total,
    roi: price > 0 ? ((total - price) / price) * 100 : 0,
    valid: price > 0 && daily > 0 && Number.isInteger(days) && days > 0,
  };
};

function Field({ label, suffix, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <input {...props}
          className="h-12 w-full rounded-xl border border-line bg-field px-4 pr-16 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-field p-3">
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-green-500" />
    </label>
  );
}

function PlanModal({ plan, onClose, onSaved }) {
  const [f, setF] = useState(plan
    ? { name: plan.name, price: String(plan.price), dailyProfit: String(plan.dailyProfit), durationDays: String(plan.durationDays), popular: plan.popular, active: plan.active }
    : EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const c = calc(f);
  const ok = c.valid && f.name.trim().length >= 2;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const submit = async (e) => {
    e.preventDefault();
    if (!ok) return;
    const body = {
      name: f.name.trim(),
      price: Number(f.price),
      dailyProfit: Number(f.dailyProfit),
      durationDays: Number(f.durationDays),
      popular: f.popular,
      active: f.active,
    };
    setBusy(true);
    try {
      if (plan) await api.patch(`/admin/plans/${plan.id}`, body);
      else await api.post("/admin/plans", body);
      toast.success(plan ? "Plan updated" : "Plan created");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the plan");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} noValidate
        className="max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">{plan ? "Edit Plan" : "Add New Plan"}</h2>
            <p className="mt-1 text-sm text-zinc-400">Changes apply to new purchases only.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <Field label="Plan name" value={f.name} maxLength={40} placeholder="e.g. Starter" onChange={(e) => set("name")(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" suffix="Rs" type="number" min="0" step="any" inputMode="decimal" value={f.price} placeholder="330" onChange={(e) => set("price")(e.target.value)} />
          <Field label="Daily profit" suffix="Rs / day" type="number" min="0" step="any" inputMode="decimal" value={f.dailyProfit} placeholder="40" onChange={(e) => set("dailyProfit")(e.target.value)} />
        </div>
        <Field label="Validity" suffix="days" type="number" min="1" step="1" inputMode="numeric" value={f.durationDays} placeholder="85" onChange={(e) => set("durationDays")(e.target.value)} />

        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-400">Calculated automatically</p>
          <div className="flex justify-between"><span className="text-zinc-300">Total Earning</span><span className="font-semibold text-white">{c.valid ? money(c.total) : "—"}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-zinc-300">ROI</span><span className="font-semibold text-white">{c.valid ? `${c.roi.toFixed(1)}%` : "—"}</span></div>
          {c.valid && c.total < Number(f.price) && (
            <p className="mt-3 text-xs text-amber-400">Customers would earn less than the plan price. Check your numbers.</p>
          )}
        </div>

        <Toggle label="Mark as Popular" hint="Shows a Popular badge. Only one plan can have it." checked={f.popular} onChange={set("popular")} />
        <Toggle label="Visible to customers" hint="Turn off to hide the plan from the Plans page." checked={f.active} onChange={set("active")} />

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Cancel</button>
          <button disabled={!ok || busy}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {plan ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPlans() {
  const { data } = useOutletContext();
  const [plans, setPlans] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | plan
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    api.get("/admin/plans")
      .then((r) => setPlans(r.data.plans))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load plans"));
  }, []);
  useEffect(load, [load]);

  if (data && data.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const toggle = async (p) => {
    setBusyId(p.id);
    try {
      await api.patch(`/admin/plans/${p.id}`, { active: !p.active });
      toast.success(p.active ? "Plan hidden from customers" : "Plan is now visible");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Action failed");
    } finally { setBusyId(""); }
  };

  const del = async (p) => {
    if (!window.confirm(`Delete "${p.name}" permanently?`)) return;
    setBusyId(p.id);
    try {
      await api.delete(`/admin/plans/${p.id}`);
      toast.success("Plan deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not delete the plan");
    } finally { setBusyId(""); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
            <SlidersHorizontal className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Manage Plans
          </h1>
          <p className="mt-1 text-sm text-zinc-400 ">Add, edit, hide or delete investment plans</p>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110">
          <Plus className="h-4 w-4" /> Add Plan
        </button>
      </div>

      {!plans ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-3xl bg-zinc-900" />)}</div>
      ) : plans.length === 0 ? (
        <p className="py-16 text-center text-zinc-400">No plans yet. Click “Add Plan” to create one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <section key={p.id} className={`flex flex-col rounded-3xl border bg-surface p-5 ${p.active ? "border-line" : "border-dashed border-zinc-700 opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-white">{p.name}</h2>
                <div className="flex gap-1.5">
                  {p.popular && <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-semibold text-white">Popular</span>}
                  {!p.active && <span className="rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300">Hidden</span>}
                </div>
              </div>
              <p className="mt-1 font-display text-3xl font-bold text-white">{money(p.price)}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-zinc-300">
                <li>{money(p.dailyProfit)} daily profit</li>
                <li>{p.durationDays} days validity</li>
                <li className="text-brand-400">Total Earning: {money(p.totalProfit)}</li>
                <li className="text-brand-400">ROI: {p.roi.toFixed(1)}%</li>
              </ul>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <button onClick={() => setEditing(p)} disabled={busyId === p.id}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => toggle(p)} disabled={busyId === p.id}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">
                  {p.active ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Show</>}
                </button>
                <button onClick={() => del(p)} disabled={busyId === p.id}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/40 text-sm font-medium text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <PlanModal plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

