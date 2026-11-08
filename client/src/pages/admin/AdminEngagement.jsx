import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2, Pin } from "lucide-react";
import api from "../../services/api";
import { money } from "../../utils/format";

const pad = (n) => String(n).padStart(2, "0");
const toLocal = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

const FIELDS = {
  achievements: [
    { key: "level", label: "Level (order)", type: "number", half: true, hint: "Members claim in this order" },
    { key: "icon", label: "Icon (emoji)", type: "text", half: true, placeholder: "🏅" },
    { key: "name", label: "Name", type: "text", placeholder: "e.g. Gold Achiever" },
    { key: "ownTarget", label: "Own investment needed", type: "number", suffix: "Rs", half: true },
    { key: "teamTarget", label: "Team investment needed", type: "number", suffix: "Rs", half: true },
    { key: "reward", label: "Reward", type: "number", suffix: "Rs" },
    { key: "active", label: "Visible to members", hint: "Turn off to hide this level", type: "toggle" },
  ],
  events: [
    { key: "title", label: "Event title", type: "text", placeholder: "e.g. Weekend Invest Challenge" },
    { key: "description", label: "Description", type: "textarea", optional: true, placeholder: "What members need to do" },
    { key: "icon", label: "Icon (emoji)", type: "text", half: true, placeholder: "🎯" },
    { key: "kind", label: "Goal type", type: "select", half: true,
      options: [["invest", "Own purchases during the event"], ["team", "Team purchases during the event"]] },
    { key: "target", label: "Goal amount", type: "number", suffix: "Rs", half: true },
    { key: "reward", label: "Reward", type: "number", suffix: "Rs", half: true },
    { key: "startsAt", label: "Starts", type: "datetime", half: true },
    { key: "endsAt", label: "Ends", type: "datetime", half: true },
    { key: "active", label: "Visible to members", type: "toggle" },
  ],
  posts: [
    { key: "title", label: "Title", type: "text", placeholder: "e.g. New plans are live" },
    { key: "body", label: "Text", type: "textarea", placeholder: "Write your announcement (max 1000 characters)" },
    { key: "kind", label: "Type", type: "select", options: [["news", "News"], ["promo", "Promotion"], ["update", "Update"]] },
    { key: "pinned", label: "Pin to the top", hint: "A pinned post also shows on the Dashboard", type: "toggle" },
    { key: "active", label: "Visible to members", type: "toggle" },
  ],
  settings: [
    { key: "checkinEnabled", label: "Daily check-in enabled", type: "toggle" },
    { key: "checkinReward", label: "Daily reward", type: "number", suffix: "Rs", half: true },
    { key: "streakDays", label: "Streak length", type: "number", suffix: "days", half: true },
    { key: "streakBonus", label: "Streak bonus (paid on the last day)", type: "number", suffix: "Rs" },
    { key: "requirePlan", label: "Require a purchased plan", hint: "Stops fake accounts from collecting the reward", type: "toggle" },
  ],
};

const NEW = {
  achievements: (d) => ({ level: String(Math.max(0, ...d.achievements.map((a) => a.level)) + 1), icon: "🏅", name: "", ownTarget: "", teamTarget: "", reward: "", active: true }),
  events: () => ({ title: "", description: "", icon: "🎯", kind: "invest", target: "", reward: "",
    startsAt: toLocal(Date.now()), endsAt: toLocal(Date.now() + 7 * 864e5), active: true }),
  posts: () => ({ title: "", body: "", kind: "news", pinned: false, active: true }),
};

const initial = (tab, item) => {
  const out = {};
  FIELDS[tab].forEach((f) => {
    const v = item[f.key];
    out[f.key] = f.type === "datetime" ? toLocal(v) : f.type === "toggle" ? !!v : v == null ? "" : String(v);
  });
  return out;
};

const build = (tab, form) => {
  const out = {};
  for (const f of FIELDS[tab]) {
    const v = form[f.key];
    if (f.type === "toggle") { out[f.key] = !!v; continue; }
    if (!f.optional && String(v ?? "").trim() === "") throw new Error(`${f.label} is required`);
    out[f.key] = f.type === "number" ? Number(v) : f.type === "datetime" ? new Date(v).toISOString() : String(v).trim();
  }
  return out;
};

const base = "h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 [color-scheme:dark]";

function Field({ f, value, onChange }) {
  if (f.type === "toggle") {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-field p-3 sm:col-span-2">
        <span>
          <span className="block text-sm font-medium text-white">{f.label}</span>
          {f.hint && <span className="block text-xs text-zinc-500">{f.hint}</span>}
        </span>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-green-500" />
      </label>
    );
  }
  return (
    <div className={f.half ? "" : "sm:col-span-2"}>
      <label className="mb-2 block text-sm font-medium text-zinc-300">{f.label}</label>
      {f.type === "textarea" ? (
        <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} maxLength={1000}
          className="w-full rounded-xl border border-line bg-field p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500" />
      ) : f.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <div className="relative">
          <input type={f.type === "datetime" ? "datetime-local" : f.type === "number" ? "number" : "text"}
            inputMode={f.type === "number" ? "decimal" : undefined} step={f.type === "number" ? "any" : undefined} min={f.type === "number" ? "0" : undefined}
            value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder}
            className={`${base} ${f.suffix ? "pr-16" : ""}`} />
          {f.suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{f.suffix}</span>}
        </div>
      )}
      {f.hint && <p className="mt-1.5 text-xs text-zinc-500">{f.hint}</p>}
    </div>
  );
}

function EditModal({ tab, item, data, onClose, onSaved }) {
  const [form, setForm] = useState(item ? initial(tab, item) : NEW[tab](data));
  const [busy, setBusy] = useState(false);
  const label = { achievements: "Achievement", events: "Event", posts: "Post" }[tab];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const submit = async (e) => {
    e.preventDefault();
    let body;
    try { body = build(tab, form); } catch (err) { return toast.error(err.message); }
    setBusy(true);
    try {
      if (item) await api.patch(`/admin/engagement/${tab}/${item.id}`, body);
      else await api.post(`/admin/engagement/${tab}`, body);
      toast.success(item ? `${label} updated` : `${label} created`);
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
          <h2 className="font-display text-xl font-bold text-white">{item ? `Edit ${label}` : `Add ${label}`}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS[tab].map((f) => <Field key={f.key} f={f} value={form[f.key]} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />)}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Cancel</button>
          <button disabled={busy} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {item ? "Save Changes" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsPanel({ settings, onSaved }) {
  const [form, setForm] = useState(initial("settings", settings));
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    let body;
    try { body = build("settings", form); } catch (err) { return toast.error(err.message); }
    setBusy(true);
    try {
      await api.put("/admin/engagement/settings", body);
      toast.success("Check-in settings saved");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} noValidate className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.settings.map((f) => <Field key={f.key} f={f} value={form[f.key]} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />)}
      </div>
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-8">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
      </button>
    </form>
  );
}

const TABS = [["achievements", "Achievements"], ["events", "Events"], ["posts", "Posts"], ["settings", "Check-in"]];

function eventStatus(e) {
  const now = Date.now();
  if (now < new Date(e.startsAt).getTime()) return ["Upcoming", "bg-blue-500/10 text-blue-400"];
  if (now > new Date(e.endsAt).getTime()) return ["Ended", "bg-zinc-700 text-zinc-300"];
  return ["Live", "bg-green-500/10 text-green-400"];
}

export default function AdminEngagement() {
  const { data: me } = useOutletContext();
  const [tab, setTab] = useState("achievements");
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(undefined); // undefined = closed, null = new, object = editing
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    api.get("/admin/engagement")
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load"));
  }, []);
  useEffect(load, [load]);

  if (me && me.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const toggle = async (item) => {
    setBusyId(item.id);
    try {
      await api.patch(`/admin/engagement/${tab}/${item.id}`, { active: !item.active });
      toast.success(item.active ? "Hidden from members" : "Now visible to members");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Action failed"); }
    finally { setBusyId(""); }
  };

  const del = async (item) => {
    const note = tab === "achievements" ? "\nMembers who already claimed it keep their reward." : "";
    if (!window.confirm(`Delete “${item.name || item.title}” permanently?${note}`)) return;
    setBusyId(item.id);
    try {
      await api.delete(`/admin/engagement/${tab}/${item.id}`);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Could not delete"); }
    finally { setBusyId(""); }
  };

  const list = data?.[tab] || [];
  const singular = { achievements: "Achievement", events: "Event", posts: "Post" }[tab];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
            <Sparkles className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Engagement
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">Manage achievements, events, announcements and check-in</p>
        </div>
        {tab !== "settings" && data && (
          <button onClick={() => setEdit(null)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 sm:w-auto">
            <Plus className="h-4 w-4" /> Add {singular}
          </button>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-brand-500 text-white" : "border border-line bg-surface text-zinc-400 hover:text-white"}`}>
            {label} {key !== "settings" && data && <span className="ml-1 opacity-70">{data[key].length}</span>}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        {!data ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : tab === "settings" ? (
          <SettingsPanel settings={data.settings} onSaved={load} />
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-zinc-400">Nothing here yet. Click “Add {singular}”.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((item) => {
              const [evText, evCls] = tab === "events" ? eventStatus(item) : [];
              return (
                <li key={item.id} className={`rounded-xl border bg-field p-3 sm:p-4 ${item.active ? "border-line" : "border-dashed border-zinc-700 opacity-70"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-white">
                        {tab === "achievements" && <><span className="text-xl">{item.icon}</span><span className="text-zinc-500">L{item.level}</span></>}
                        {tab === "events" && <span className="text-xl">{item.icon}</span>}
                        {tab === "posts" && item.pinned && <Pin className="h-4 w-4 text-amber-400" />}
                        <span className="break-words">{item.name || item.title}</span>
                        {!item.active && <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">Hidden</span>}
                        {tab === "events" && <span className={`rounded-full px-2 py-0.5 text-xs ${evCls}`}>{evText}</span>}
                      </p>
                      <p className="mt-1 break-words text-xs text-zinc-500 sm:text-sm">
                        {tab === "achievements" && `Own ${money(item.ownTarget)} · Team ${money(item.teamTarget)} · Reward ${money(item.reward)}`}
                        {tab === "events" && `${item.kind === "invest" ? "Own purchases" : "Team purchases"} ${money(item.target)} · Reward ${money(item.reward)} · ${fmt(item.startsAt)} → ${fmt(item.endsAt)}`}
                        {tab === "posts" && `${item.kind} · ${fmt(item.createdAt)} · ${item.body.slice(0, 70)}${item.body.length > 70 ? "…" : ""}`}
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                      <button onClick={() => setEdit(item)} disabled={busyId === item.id}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      <button onClick={() => toggle(item)} disabled={busyId === item.id}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium text-white hover:bg-zinc-800">
                        {item.active ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Show</>}
                      </button>
                      <button onClick={() => del(item)} disabled={busyId === item.id}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/40 px-3 text-sm font-medium text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {edit !== undefined && (
        <EditModal tab={tab} item={edit} data={data} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />
      )}
    </div>
  );
}

