import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Landmark, Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2, UploadCloud, Copy, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import MethodLogo from "../../components/ui/MethodLogo";

const EMPTY = { name: "", kind: "wallet", accountName: "", accountNumber: "", instructions: "", sort: "0", active: true };
const input = "h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 [color-scheme:dark]";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function AccountModal({ item, onClose, onSaved }) {
  const [f, setF] = useState(
    item
      ? { name: item.name, kind: item.kind, accountName: item.accountName, accountNumber: item.accountNumber, instructions: item.instructions, sort: String(item.sort), active: item.active }
      : EMPTY
  );
  const [newLogo, setNewLogo] = useState("");      // file name after upload
  const [removed, setRemoved] = useState(false);
  const [up, setUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const logo = newLogo ? `/uploads/methods/${newLogo}` : removed ? "" : item?.logo || "";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && !up && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy, up]);

  const pickLogo = async (file) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error("Only PNG, JPG or WEBP images are allowed");
    if (file.size > 1024 * 1024) return toast.error("Logo must be under 1 MB");
    const fd = new FormData();
    fd.append("logo", file);
    setUp(true);
    try {
      const { data } = await api.post("/admin/payment-methods/logo", fd);
      setNewLogo(data.file);
      setRemoved(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Upload failed");
    } finally { setUp(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return toast.error("Enter the method name");
    if (f.accountName.trim().length < 3) return toast.error("Enter the account holder name");
    if (!/^[A-Za-z0-9 -]{5,34}$/.test(f.accountNumber.trim())) return toast.error("Enter a valid account number (5 to 34 letters or numbers)");

    const body = {
      name: f.name.trim(), kind: f.kind, accountName: f.accountName.trim(), accountNumber: f.accountNumber.trim(),
      instructions: f.instructions.trim(), sort: Number(f.sort || 0), active: f.active,
    };
    if (newLogo) body.logoFile = newLogo;
    else if (removed && item) body.removeLogo = true;

    setBusy(true);
    try {
      if (item) await api.patch(`/admin/payment-methods/${item.id}`, body);
      else await api.post("/admin/payment-methods", body);
      toast.success(item ? "Account updated" : "Account added");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the account");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && !up && onClose()}>
      <form onSubmit={submit} noValidate onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">{item ? "Edit Account" : "Add Payment Account"}</h2>
            <p className="mt-1 text-sm text-zinc-400">Members send their payment to this account.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy || up} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          {/* logo */}
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-field p-3">
            <MethodLogo method={{ name: f.name || "?", logo }} size="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Logo</p>
              <p className="text-xs text-zinc-500">PNG, JPG or WEBP, under 1 MB. A square image looks best.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-brand-500/15 px-3 text-xs font-semibold text-brand-400 hover:bg-brand-500/25">
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={up}
                    onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
                  {up ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} {logo ? "Replace" : "Upload"}
                </label>
                {logo && (
                  <button type="button" onClick={() => { setNewLogo(""); setRemoved(true); }}
                    className="h-9 rounded-lg border border-line px-3 text-xs text-zinc-300 hover:bg-zinc-800">Remove</button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Method name"><input value={f.name} onChange={set("name")} maxLength={30} placeholder="e.g. EasyPaisa" className={input} /></Field>
            <Field label="Account type">
              <select value={f.kind} onChange={set("kind")} className={input}>
                <option value="wallet">Mobile wallet</option>
                <option value="bank">Bank account</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Account holder name" hint="Exactly as it appears in your app or bank.">
                <input value={f.accountName} onChange={set("accountName")} maxLength={60} placeholder="Your account name" className={input} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={f.kind === "bank" ? "IBAN / Account number" : "Account number"}>
                <input value={f.accountNumber} onChange={set("accountNumber")} maxLength={34} placeholder={f.kind === "bank" ? "PK36SCBL0000001123456702" : "03XXXXXXXXX"} className={`${input} font-mono`} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Instructions (optional)" hint="Shown to the member on the payment page, e.g. “Use the Send Money option and keep the receipt.”">
                <textarea value={f.instructions} onChange={set("instructions")} maxLength={300} rows={3}
                  className="w-full rounded-xl border border-line bg-field p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500" />
              </Field>
            </div>
            <Field label="Display order" hint="Lower numbers show first.">
              <input type="number" min="0" max="999" step="1" inputMode="numeric" value={f.sort} onChange={set("sort")} className={input} />
            </Field>
            <label className="flex cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-line bg-field p-3">
              <span>
                <span className="block text-sm font-medium text-white">Visible to members</span>
                <span className="block text-xs text-zinc-500">Turn off to stop using this account.</span>
              </span>
              <input type="checkbox" checked={f.active} onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))} className="h-5 w-5 shrink-0 accent-green-500" />
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={busy || up} className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Cancel</button>
          <button disabled={busy || up} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {item ? "Save Changes" : "Add Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPayments() {
  const { data: me } = useOutletContext();
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(undefined); // undefined closed, null new, object edit
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    api.get("/admin/payment-methods")
      .then((r) => setList(r.data.methods))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load accounts"));
  }, []);
  useEffect(load, [load]);

  if (me && me.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const toggle = async (m) => {
    setBusyId(m.id);
    try {
      await api.patch(`/admin/payment-methods/${m.id}`, { active: !m.active });
      toast.success(m.active ? "Account hidden from members" : "Account is now visible");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Action failed"); }
    finally { setBusyId(""); }
  };

  const del = async (m) => {
    if (!window.confirm(`Delete “${m.name}” permanently?\nOld payments keep their own record.`)) return;
    setBusyId(m.id);
    try {
      await api.delete(`/admin/payment-methods/${m.id}`);
      toast.success("Account deleted");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Could not delete"); }
    finally { setBusyId(""); }
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };

  const visible = list?.filter((m) => m.active).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
            <Landmark className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Payment Accounts
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">The accounts members send their deposits to</p>
        </div>
        {list && (
          <button onClick={() => setEdit(null)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 sm:w-auto">
            <Plus className="h-4 w-4" /> Add Account
          </button>
        )}
      </div>

      {list && visible === 0 && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          No account is visible to members, so nobody can pay. Add an account or switch one on.
        </p>
      )}

      {!list ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="h-60 animate-pulse rounded-3xl bg-zinc-900" />)}</div>
      ) : list.length === 0 ? (
        <section className="rounded-3xl border border-line bg-surface px-4 py-14 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><Landmark className="h-7 w-7" /></div>
          <p className="font-display text-lg font-semibold text-white">No accounts yet</p>
          <p className="mt-1 text-sm text-zinc-400">Add your EasyPaisa, JazzCash, NayaPay or a bank account.</p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <section key={m.id} className={`flex flex-col rounded-3xl border bg-surface p-5 ${m.active ? "border-line" : "border-dashed border-zinc-700 opacity-70"}`}>
              <div className="flex items-center gap-3">
                <MethodLogo method={m} size="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-bold text-white">{m.name}</h2>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-300">{m.kind === "bank" ? "Bank" : "Wallet"}</span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">Order {m.sort}</span>
                    {!m.active && <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200">Hidden</span>}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-xl bg-field p-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Account name</p>
                    <p className="truncate font-medium text-white">{m.accountName}</p>
                  </div>
                  <button onClick={() => copy(m.accountName)} aria-label="Copy name" className="shrink-0 text-zinc-400 hover:text-white"><Copy className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl bg-field p-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">{m.kind === "bank" ? "IBAN / Account number" : "Account number"}</p>
                    <p className="truncate font-mono font-medium text-white">{m.accountNumber}</p>
                  </div>
                  <button onClick={() => copy(m.accountNumber)} aria-label="Copy number" className="shrink-0 text-zinc-400 hover:text-white"><Copy className="h-4 w-4" /></button>
                </div>
                {m.instructions && <p className="line-clamp-2 text-xs text-zinc-400">{m.instructions}</p>}
              </div>

              <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
                <button onClick={() => setEdit(m)} disabled={busyId === m.id}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => toggle(m)} disabled={busyId === m.id}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">
                  {m.active ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Show</>}
                </button>
                <button onClick={() => del(m)} disabled={busyId === m.id}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/40 text-sm font-medium text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </section>
          ))}
        </div>
      )}

      {edit !== undefined && <AccountModal item={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />}
    </div>
  );
}

