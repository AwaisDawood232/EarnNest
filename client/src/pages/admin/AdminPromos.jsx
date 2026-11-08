import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Ticket, Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2, Copy } from "lucide-react";
import api from "../../services/api";
import { money } from "../../utils/format";

const pad = (n) => String(n).padStart(2, "0");
const toLocal = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const APPLIES = { first: "First deposit only", repeat: "Repeat deposits only", any: "Any deposit" };

const EMPTY = {
  code: "", title: "", description: "", type: "percent", value: "", maxBonus: "0",
  applies: "any", minDeposit: "0", maxUses: "0", expiresAt: "", public: true, active: true,
};

const input = "h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 [color-scheme:dark]";

function Field({ label, hint, suffix, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        {children}
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-green-500" />
    </label>
  );
}

function CodeModal({ item, onClose, onSaved }) {
  const [f, setF] = useState(
    item
      ? { ...item, value: String(item.value), maxBonus: String(item.maxBonus), minDeposit: String(item.minDeposit), maxUses: String(item.maxUses), expiresAt: toLocal(item.expiresAt) }
      : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target ? e.target.value : e }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const submit = async (e) => {
    e.preventDefault();
    if (!item && f.code.trim().length < 3) return toast.error("Enter a code (3 to 20 letters or numbers)");
    if (f.title.trim().length < 3) return toast.error("Enter a title");
    if (!(Number(f.value) > 0)) return toast.error("Enter the bonus value");

    const body = {
      title: f.title.trim(), description: f.description.trim(), type: f.type,
      value: Number(f.value), maxBonus: Number(f.maxBonus || 0), applies: f.applies,
      minDeposit: Number(f.minDeposit || 0), maxUses: Number(f.maxUses || 0),
      expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null,
      public: f.public, active: f.active,
    };
    if (!item) body.code = f.code.trim();

    setBusy(true);
    try {
      if (item) await api.patch(`/admin/promos/${item.id}`, body);
      else await api.post("/admin/promos", body);
      toast.success(item ? "Promo code updated" : "Promo code created");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">{item ? "Edit Promo Code" : "New Promo Code"}</h2>
            <p className="mt-1 text-sm text-zinc-400">Members claim it on a recent approved deposit.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Code" hint={item ? "The code itself cannot be changed. Create a new one instead." : "Letters and numbers only, e.g. WELCOME10"}>
              <input value={f.code} disabled={!!item} maxLength={20} placeholder="WELCOME10"
                onChange={(e) => setF((x) => ({ ...x, code: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() }))}
                className={`${input} font-mono uppercase tracking-widest disabled:opacity-60`} />
            </Field>
          </div>
          <div className="sm:col-span-2"><Field label="Title (shown to members)"><input value={f.title} onChange={set("title")} maxLength={50} placeholder="First deposit bonus" className={input} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description (optional)"><input value={f.description} onChange={set("description")} maxLength={120} placeholder="On your very first deposit, once" className={input} /></Field></div>

          <Field label="Bonus type">
            <select value={f.type} onChange={set("type")} className={input}>
              <option value="percent">Percent of the deposit</option>
              <option value="fixed">Fixed amount (Rs)</option>
            </select>
          </Field>
          <Field label="Bonus value" suffix={f.type === "percent" ? "%" : "Rs"}>
            <input type="number" min="0" step="any" inputMode="decimal" value={f.value} onChange={set("value")} placeholder={f.type === "percent" ? "5" : "50"} className={`${input} pr-12`} />
          </Field>

          {f.type === "percent" && (
            <div className="sm:col-span-2">
              <Field label="Maximum bonus" suffix="Rs" hint="Caps a percentage bonus. Use 0 for no limit.">
                <input type="number" min="0" step="any" inputMode="decimal" value={f.maxBonus} onChange={set("maxBonus")} className={`${input} pr-12`} />
              </Field>
            </div>
          )}

          <div className="sm:col-span-2">
            <Field label="Works on">
              <select value={f.applies} onChange={set("applies")} className={input}>
                {Object.entries(APPLIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Minimum deposit" suffix="Rs" hint="0 = no minimum">
            <input type="number" min="0" step="any" inputMode="decimal" value={f.minDeposit} onChange={set("minDeposit")} className={`${input} pr-12`} />
          </Field>
          <Field label="Total usage limit" hint="0 = unlimited. Each member can use a code once.">
            <input type="number" min="0" step="1" inputMode="numeric" value={f.maxUses} onChange={set("maxUses")} className={input} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Expires (optional)" hint="Leave empty for no expiry">
              <div className="flex gap-2">
                <input type="datetime-local" value={f.expiresAt} onChange={set("expiresAt")} className={input} />
                {f.expiresAt && <button type="button" onClick={() => set("expiresAt")("")} className="shrink-0 rounded-xl border border-line px-4 text-sm text-zinc-300 hover:bg-zinc-800">Clear</button>}
              </div>
            </Field>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <Toggle label="Show to all members" hint="Appears in “Available bonuses”. Turn off for a secret code you share yourself." checked={f.public} onChange={(v) => setF((x) => ({ ...x, public: v }))} />
            <Toggle label="Active" hint="Turn off to stop members from using it." checked={f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Cancel</button>
          <button disabled={busy} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {item ? "Save Changes" : "Create Code"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="truncate font-display text-lg font-bold text-white sm:text-2xl">{value}</p>
    </div>
  );
}

export default function AdminPromos() {
  const { data: me } = useOutletContext();
  const [d, setD] = useState(null);
  const [edit, setEdit] = useState(undefined); // undefined closed, null new, object edit
  const [days, setDays] = useState("");
  const [busyId, setBusyId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get("/admin/promos")
      .then((r) => { setD(r.data); setDays(String(r.data.settings.claimWindowDays)); })
      .catch((e) => toast.error(e.response?.data?.message || "Could not load promo codes"));
  }, []);
  useEffect(load, [load]);

  if (me && me.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const saveWindow = async () => {
    setSaving(true);
    try {
      await api.put("/admin/promos/settings", { claimWindowDays: Number(days) });
      toast.success("Claim window saved");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Could not save"); }
    finally { setSaving(false); }
  };

  const toggle = async (c) => {
    setBusyId(c.id);
    try {
      await api.patch(`/admin/promos/${c.id}`, { active: !c.active });
      toast.success(c.active ? "Code disabled" : "Code enabled");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Action failed"); }
    finally { setBusyId(""); }
  };

  const del = async (c) => {
    if (!window.confirm(`Delete code “${c.code}” permanently?\nBonuses already paid are not affected.`)) return;
    setBusyId(c.id);
    try {
      await api.delete(`/admin/promos/${c.id}`);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Could not delete"); }
    finally { setBusyId(""); }
  };

  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast.success("Code copied"); } catch { toast.error("Copy failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
            <Ticket className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Promo Codes
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">Create bonus codes for your members</p>
        </div>
        {d && (
          <button onClick={() => setEdit(null)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 sm:w-auto">
            <Plus className="h-4 w-4" /> New Code
          </button>
        )}
      </div>

      {!d ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Codes" value={d.stats.codes} />
            <Stat label="Times claimed" value={d.stats.claims} />
            <Stat label="Bonus paid" value={money(d.stats.paid)} />
          </div>

          <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="w-full sm:w-auto">
              <label className="mb-2 block text-sm font-medium text-zinc-300">Claim window (days)</label>
              <input type="number" min="1" max="30" value={days} onChange={(e) => setDays(e.target.value)} className={`${input} sm:w-40`} />
            </div>
            <button onClick={saveWindow} disabled={saving}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
            <p className="w-full text-xs text-zinc-500">How many days after approval a member can still claim a bonus on a deposit.</p>
          </section>

          {d.codes.length === 0 ? (
            <p className="rounded-3xl border border-line bg-surface py-14 text-center text-zinc-400">No promo codes yet. Click “New Code”.</p>
          ) : (
            <ul className="space-y-3">
              {d.codes.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const full = c.maxUses > 0 && c.usedCount >= c.maxUses;
                return (
                  <li key={c.id} className={`rounded-2xl border bg-surface p-4 sm:p-5 ${c.active ? "border-line" : "border-dashed border-zinc-700 opacity-70"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => copy(c.code)} className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-600 px-3 py-1 font-mono text-sm font-bold tracking-widest text-white hover:border-brand-500">
                            {c.code} <Copy className="h-3.5 w-3.5 text-zinc-400" />
                          </button>
                          <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-bold text-green-400">
                            {c.type === "percent" ? `${c.value}%` : money(c.value)}
                          </span>
                          {c.public && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">Public</span>}
                          {!c.active && <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">Disabled</span>}
                          {expired && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Expired</span>}
                          {full && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">Limit reached</span>}
                        </div>
                        <p className="mt-2 font-medium text-white">{c.title}</p>
                        <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                          {APPLIES[c.applies]}
                          {c.minDeposit > 0 && ` · Min ${money(c.minDeposit)}`}
                          {c.type === "percent" && c.maxBonus > 0 && ` · Cap ${money(c.maxBonus)}`}
                          {` · Used ${c.usedCount}${c.maxUses > 0 ? ` / ${c.maxUses}` : ""}`}
                          {` · Expires ${c.expiresAt ? fmt(c.expiresAt) : "never"}`}
                        </p>
                      </div>
                      <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                        <button onClick={() => setEdit(c)} disabled={busyId === c.id}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                        <button onClick={() => toggle(c)} disabled={busyId === c.id}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium text-white hover:bg-zinc-800">
                          {c.active ? <><EyeOff className="h-3.5 w-3.5" /> Off</> : <><Eye className="h-3.5 w-3.5" /> On</>}
                        </button>
                        <button onClick={() => del(c)} disabled={busyId === c.id}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/40 px-3 text-sm font-medium text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {edit !== undefined && <CodeModal item={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />}
    </div>
  );
}


