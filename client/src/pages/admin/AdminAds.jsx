import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Film, Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2, UploadCloud, Search } from "lucide-react";
import api from "../../services/api";
import { assetUrl } from "../../utils/assets";
import { money } from "../../utils/format";

const TYPES = [["youtube", "YouTube link"], ["video", "Video link (.mp4 / .webm)"], ["upload", "Upload a video"]];
const TYPE_LABEL = { youtube: "YouTube", video: "Video link", upload: "Uploaded" };
const EMPTY = { title: "", description: "", type: "youtube", source: "", requiredSec: "30", reward: "", sort: "0", active: true };
const dur = (s) => (s >= 60 ? `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ""}` : `${s}s`);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
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
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-green-500" />
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <p className="truncate text-xs text-zinc-400">{label}</p>
      <p className="truncate font-display text-lg font-bold text-white sm:text-2xl">{value}</p>
    </div>
  );
}

/* ---------------- add / edit ---------------- */
function AdModal({ item, onClose, onSaved }) {
  const [f, setF] = useState(
    item
      ? {
          title: item.title, description: item.description, type: item.type,
          source: item.type === "youtube" ? item.videoId : item.type === "upload" ? item.file : item.url,
          requiredSec: String(item.requiredSec), reward: String(item.reward), sort: String(item.sort), active: item.active,
        }
      : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && up === null && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy, up]);

  const pickFile = async (file) => {
    if (!file) return;
    if (!["video/mp4", "video/webm"].includes(file.type)) return toast.error("Only MP4 or WEBM videos are allowed");
    if (file.size > 80 * 1024 * 1024) return toast.error("Video must be under 80 MB");

    const fd = new FormData();
    fd.append("video", file);
    setUp(0);
    try {
      const { data } = await api.post("/admin/ads/upload", fd, {
        onUploadProgress: (e) => e.total && setUp(Math.round((e.loaded / e.total) * 100)),
      });
      setF((x) => ({ ...x, source: data.file }));

      // suggest the video length as the required watch time
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        if (isFinite(v.duration)) setF((x) => ({ ...x, requiredSec: String(Math.max(5, Math.floor(v.duration))) }));
        URL.revokeObjectURL(url);
      };
      v.src = url;
      toast.success("Video uploaded");
    } catch (e) {
      toast.error(e.response?.data?.message || "Upload failed");
    } finally { setUp(null); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (f.title.trim().length < 3) return toast.error("Enter a title");
    if (!f.source.trim()) return toast.error(f.type === "upload" ? "Upload a video first" : "Add the video link");
    if (!(Number(f.requiredSec) >= 5)) return toast.error("Watch time must be at least 5 seconds");
    if (!(Number(f.reward) > 0)) return toast.error("Enter the reward");

    const body = {
      title: f.title.trim(), description: f.description.trim(), type: f.type, source: f.source.trim(),
      requiredSec: Number(f.requiredSec), reward: Number(f.reward), sort: Number(f.sort || 0), active: f.active,
    };
    setBusy(true);
    try {
      if (item) await api.patch(`/admin/ads/${item.id}`, body);
      else await api.post("/admin/ads", body);
      toast.success(item ? "Ad updated" : "Ad created");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the ad");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && up === null && onClose()}>
      <form onSubmit={submit} noValidate onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-white">{item ? "Edit Ad" : "Add New Ad"}</h2>
          <button type="button" onClick={onClose} disabled={busy || up !== null} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Title"><input value={f.title} onChange={set("title")} maxLength={80} placeholder="e.g. Summer Collection" className={input} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description (optional)"><input value={f.description} onChange={set("description")} maxLength={200} placeholder="Shown under the title" className={input} /></Field></div>

          <div className="sm:col-span-2">
            <Field label="Video source">
              <select value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value, source: "" }))} className={input}>
                {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
          </div>

          <div className="sm:col-span-2">
            {f.type === "upload" ? (
              <Field label="Video file" hint="MP4 or WEBM, up to 80 MB. The watch time is filled in from the video length.">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-500/40 bg-field px-4 py-6 text-center hover:border-brand-400">
                  <input type="file" accept="video/mp4,video/webm" className="hidden" disabled={up !== null}
                    onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                  {up !== null ? (
                    <><Loader2 className="h-7 w-7 animate-spin text-brand-400" /><span className="text-sm text-white">Uploading… {up}%</span></>
                  ) : (
                    <><UploadCloud className="h-7 w-7 text-brand-400" /><span className="text-sm font-semibold text-white">{f.source ? "Replace video" : "Choose a video"}</span></>
                  )}
                </label>
                {f.source && (
                  <video src={assetUrl(`/uploads/ads/${f.source}`)} controls preload="metadata" className="mt-3 max-h-52 w-full rounded-xl bg-black" />
                )}
              </Field>
            ) : (
              <Field label={f.type === "youtube" ? "YouTube link" : "Video link"}
                hint={f.type === "youtube" ? "Paste any YouTube link. Make sure embedding is allowed for the video." : "A direct https link that ends in .mp4 or .webm."}>
                <input value={f.source} onChange={set("source")} inputMode="url" maxLength={500}
                  placeholder={f.type === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://example.com/video.mp4"} className={input} />
              </Field>
            )}
          </div>

          <Field label="Required watch time" suffix="seconds" hint="Members must watch this long to earn.">
            <input type="number" min="5" max="3600" step="1" inputMode="numeric" value={f.requiredSec} onChange={set("requiredSec")} className={`${input} pr-20`} />
          </Field>
          <Field label="Reward" suffix="Rs" hint="Paid to the Earning Wallet.">
            <input type="number" min="0" step="any" inputMode="decimal" value={f.reward} onChange={set("reward")} placeholder="5" className={`${input} pr-12`} />
          </Field>
          <Field label="Display order" hint="Lower numbers show first.">
            <input type="number" min="0" step="1" inputMode="numeric" value={f.sort} onChange={set("sort")} className={input} />
          </Field>
          <div className="self-end">
            <Toggle label="Visible to members" checked={f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} disabled={busy || up !== null} className="h-12 flex-1 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">Cancel</button>
          <button disabled={busy || up !== null} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {item ? "Save Changes" : "Create Ad"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- settings ---------------- */
function SettingsPanel({ settings, onSaved }) {
  const [f, setF] = useState({
    enabled: settings.enabled, requirePlan: settings.requirePlan,
    limitWithPlan: String(settings.limitWithPlan), limitNoPlan: String(settings.limitNoPlan), cooldownSec: String(settings.cooldownSec),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/admin/ads/settings", {
        enabled: f.enabled, requirePlan: f.requirePlan,
        limitWithPlan: Number(f.limitWithPlan), limitNoPlan: Number(f.limitNoPlan), cooldownSec: Number(f.cooldownSec),
      });
      toast.success("Watch Ads settings saved");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} noValidate className="max-w-xl space-y-4">
      <Toggle label="Watch Ads enabled" hint="Turn off to pause the whole feature for all members." checked={f.enabled} onChange={(v) => setF((x) => ({ ...x, enabled: v }))} />
      <Toggle label="Require an active plan" hint="On: only members with a running plan can watch. Off: everyone can watch." checked={f.requirePlan} onChange={(v) => setF((x) => ({ ...x, requirePlan: v }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Daily limit with a plan" suffix="ads" hint="Ads per day for members with an active plan.">
          <input type="number" min="1" max="200" value={f.limitWithPlan} onChange={set("limitWithPlan")} className={`${input} pr-14`} />
        </Field>
        <Field label="Daily limit without a plan" suffix="ads" hint={f.requirePlan ? "Not used while a plan is required." : "Ads per day for members with no plan."}>
          <input type="number" min="0" max="200" value={f.limitNoPlan} onChange={set("limitNoPlan")} className={`${input} pr-14`} />
        </Field>
      </div>
      <Field label="Wait between ads" suffix="seconds" hint="A short pause after each completed ad. Use 0 for none.">
        <input type="number" min="0" max="600" value={f.cooldownSec} onChange={set("cooldownSec")} className={`${input} pr-20`} />
      </Field>
      <p className="text-xs text-zinc-500">Each member can watch each ad once per day. Daily limits reset at midnight UTC (5:00 AM in Pakistan).</p>
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-8">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
      </button>
    </form>
  );
}

/* ---------------- activity ---------------- */
function Activity() {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/admin/ads/activity")
      .then((r) => setItems(r.data.items))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load activity"));
  }, []);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items || []).filter((i) =>
      (status === "all" || i.status === status) &&
      (!term || [i.name, i.email, i.adTitle].some((v) => v.toLowerCase().includes(term)))
    );
  }, [items, status, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member or ad" className={`${input} pl-11`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${input} sm:w-56`}>
          <option value="all">All activity</option>
          <option value="completed">Completed (paid)</option>
          <option value="started">Not finished</option>
        </select>
      </div>

      {!items ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}</div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-zinc-400">No activity found</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((i) => {
            const done = i.status === "completed";
            return (
              <li key={i.id} className="rounded-xl border border-line bg-field p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{i.name} <span className="font-normal text-zinc-500">· {i.email}</span></p>
                    <p className="mt-0.5 text-sm text-zinc-300">{i.adTitle}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Watched {done ? dur(i.watchedSec) : "partly"} of {dur(i.requiredSec)}
                      {i.attempts > 1 && ` · ${i.attempts} attempts`} · {fmt(done ? i.completedAt : i.startedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${done ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {done ? "Completed" : "Not finished"}
                    </span>
                    <p className={`mt-2 font-display font-bold ${done ? "text-green-400" : "text-zinc-500"}`}>{done ? `+${money(i.reward)}` : "No reward"}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-center text-xs text-zinc-500">Showing the latest 300 records. There is one record per member, ad and day.</p>
    </div>
  );
}

/* ---------------- page ---------------- */
const TABS = [["ads", "Ads"], ["activity", "Activity"], ["settings", "Settings"]];

export default function AdminAds() {
  const { data: me } = useOutletContext();
  const [tab, setTab] = useState("ads");
  const [d, setD] = useState(null);
  const [edit, setEdit] = useState(undefined); // undefined closed, null new, object edit
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    api.get("/admin/ads")
      .then((r) => setD(r.data))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load ads"));
  }, []);
  useEffect(load, [load]);

  if (me && me.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const toggle = async (a) => {
    setBusyId(a.id);
    try {
      await api.patch(`/admin/ads/${a.id}`, { active: !a.active });
      toast.success(a.active ? "Ad hidden from members" : "Ad is now visible");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Action failed"); }
    finally { setBusyId(""); }
  };

  const del = async (a) => {
    if (!window.confirm(`Delete “${a.title}” permanently?\nRewards already paid are not affected.`)) return;
    setBusyId(a.id);
    try {
      await api.delete(`/admin/ads/${a.id}`);
      toast.success("Ad deleted");
      load();
    } catch (e) { toast.error(e.response?.data?.message || "Could not delete"); }
    finally { setBusyId(""); }
  };

  const s = d?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
            <Film className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Ads Manager
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">Add ads, set rewards and see who is watching</p>
        </div>
        {tab === "ads" && d && (
          <button onClick={() => setEdit(null)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 sm:w-auto">
            <Plus className="h-4 w-4" /> Add Ad
          </button>
        )}
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Members watching today" value={s.watchersToday} />
          <Stat label="Ads watched today" value={s.watchedToday} />
          <Stat label="Paid today" value={money(s.paidToday)} />
          <Stat label="Watch time today" value={s.secondsToday ? dur(s.secondsToday) : "0s"} />
          <Stat label="Total views" value={s.totalViews} />
          <Stat label="Total paid" value={money(s.totalPaid)} />
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-brand-500 text-white" : "border border-line bg-surface text-zinc-400 hover:text-white"}`}>
            {label} {key === "ads" && d && <span className="ml-1 opacity-70">{d.ads.length}</span>}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        {tab === "activity" ? <Activity /> : !d ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
        ) : tab === "settings" ? (
          <SettingsPanel settings={d.settings} onSaved={load} />
        ) : d.ads.length === 0 ? (
          <p className="py-12 text-center text-zinc-400">No ads yet. Click “Add Ad” to create the first one.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.ads.map((a) => (
              <div key={a.id} className={`flex flex-col overflow-hidden rounded-2xl border bg-field ${a.active ? "border-line" : "border-dashed border-zinc-700 opacity-70"}`}>
                <div className="relative aspect-video bg-gradient-to-br from-green-950 to-zinc-900">
                  {a.thumb ? <img src={a.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                    : a.type === "upload" ? <video src={assetUrl(a.src)} preload="metadata" muted className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-brand-400"><Film className="h-10 w-10" /></div>}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-0.5 text-xs font-semibold text-white">{TYPE_LABEL[a.type]}</span>
                  {!a.active && <span className="absolute right-2 top-2 rounded-full bg-zinc-700 px-2.5 py-0.5 text-xs text-zinc-200">Hidden</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-base font-bold text-white">{a.title}</h3>
                  <p className="mt-1 text-xs text-zinc-400">Watch {dur(a.requiredSec)} · Reward <span className="font-semibold text-green-400">{money(a.reward)}</span> · Order {a.sort}</p>
                  <p className="mt-1 text-xs text-zinc-500">{a.views} views · {money(a.paid)} paid</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button onClick={() => setEdit(a)} disabled={busyId === a.id}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    <button onClick={() => toggle(a)} disabled={busyId === a.id}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800">
                      {a.active ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Show</>}
                    </button>
                    <button onClick={() => del(a)} disabled={busyId === a.id}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/40 text-sm font-medium text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {edit !== undefined && <AdModal item={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />}
    </div>
  );
}

