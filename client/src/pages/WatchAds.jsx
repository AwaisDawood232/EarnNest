import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { DollarSign, Eye, Layers, Clock, AlertCircle, Play, Check, RefreshCw, Loader2, Film, Timer } from "lucide-react";
import api from "../services/api";
import StatCard from "../components/ui/StatCard";
import Celebration from "../components/ui/Celebration";
import AdPlayer from "../components/AdPlayer";
import { money } from "../utils/format";

const dur = (s) => (s >= 60 ? `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ""}` : `${s}s`);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");

export default function WatchAds() {
  const { reload } = useOutletContext();
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);
  const [session, setSession] = useState(null);
  const [starting, setStarting] = useState("");
  const [cel, setCel] = useState(null);
  const [wait, setWait] = useState(0);

  const load = useCallback(() =>
    api.get("/ads")
      .then((r) => { setD(r.data); setWait(r.data.cooldownLeft); setFailed(false); })
      .catch((e) => { setFailed(true); toast.error(e.response?.data?.message || "Could not load ads"); }),
  []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const start = async (ad) => {
    setStarting(ad.id);
    try {
      const { data } = await api.post(`/ads/${ad.id}/start`);
      setSession(data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not start this ad");
      load();
    } finally { setStarting(""); }
  };

  const onDone = useCallback((r) => {
    setSession(null);
    setCel({
      icon: "📺", title: "Reward earned", amount: r.reward,
      subtitle: `${r.remaining} ad${r.remaining === 1 ? "" : "s"} left today. Added to your Earning Wallet.`,
    });
    load();
    reload();
  }, [load, reload]);

  if (failed && !d) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-zinc-400">We could not load this page.</p>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-10 w-1/2 rounded-lg bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-900" />)}</div>
        <div className="h-72 rounded-3xl bg-zinc-900" />
      </div>
    );
  }

  const pct = d.limit > 0 ? Math.min((d.watchedToday / d.limit) * 100, 100) : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Watch Ads</h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">Earn money by watching ads</p>
        </div>
        <span className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-400">
          <Eye className="h-4 w-4" /> {d.remaining} ads left today
        </span>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard layout="row" icon={DollarSign} tone="green"  label="Earning Wallet"   value={money(d.wallet)} />
        <StatCard layout="row" icon={Eye}        tone="blue"   label="Daily Remaining"  value={`${d.remaining} ads`} />
        <StatCard layout="row" icon={Layers}     tone="purple" label="Active Plans"     value={d.activePlans} />
        <StatCard layout="row" icon={Clock}      tone="amber"  label="Watch Time Today" value={d.seconds ? dur(d.seconds) : "0s"} />
      </section>

      {d.blocked ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-400"><AlertCircle className="h-8 w-8" /></div>
          <h2 className="font-display text-xl font-bold text-white">{!d.enabled ? "Watch Ads is paused" : d.requirePlan && d.activePlans === 0 ? "No Active Plan" : "Not available"}</h2>
          <p className="max-w-md text-sm text-zinc-400 sm:text-base">{d.blocked}</p>
          {d.requirePlan && d.activePlans === 0 && d.enabled && (
            <Link to="/plans" className="mt-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">Browse Plans</Link>
          )}
        </section>
      ) : (
        <section className="space-y-5 rounded-3xl border border-line bg-surface p-4 sm:p-6">
          <div>
            <div className="mb-1.5 flex justify-between text-sm text-zinc-400">
              <span>Today's progress</span><span className="text-white">{d.watchedToday} / {d.limit} ads · {money(d.earnedToday)} earned</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {wait > 0 && d.remaining > 0 && (
            <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              <Timer className="h-4 w-4" /> Next ad available in {wait}s
            </p>
          )}
          {d.remaining === 0 && (
            <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
              You watched all your ads for today. Come back tomorrow for more.
            </p>
          )}

          {d.ads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><Film className="h-7 w-7" /></div>
              <p className="font-display text-lg font-semibold text-white">No ads right now</p>
              <p className="text-sm text-zinc-400">New ads are added regularly. Please check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {d.ads.map((a) => {
                const locked = a.watched || d.remaining === 0 || wait > 0;
                return (
                  <div key={a.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-field">
                    <div className="relative aspect-video bg-gradient-to-br from-green-950 to-zinc-900">
                      {a.thumb ? <img src={a.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                        : <div className="grid h-full w-full place-items-center text-brand-400"><Film className="h-10 w-10" /></div>}
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">{dur(a.requiredSec)}</span>
                      {a.watched && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-bold text-black"><Check className="h-3 w-3" /> Watched</span>}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-base font-bold text-white">{a.title}</h3>
                      {a.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-400 sm:text-sm">{a.description}</p>}
                      <p className="mt-3 font-display text-lg font-bold text-green-400">+{money(a.reward)}</p>
                      <button onClick={() => start(a)} disabled={locked || !!starting}
                        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
                        {starting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : a.watched ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {a.watched ? "Come back tomorrow" : "Watch & Earn"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {d.history.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white sm:text-xl">Recently watched</h2>
          <ul className="space-y-3">
            {d.history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 rounded-xl border border-line bg-field p-3 sm:p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-500/10 text-green-400"><Play className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{h.title}</p>
                  <p className="text-xs text-zinc-500">Watched {dur(h.seconds)} · {fmt(h.at)}</p>
                </div>
                <p className="shrink-0 font-display font-bold text-green-400">+{money(h.reward)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border border-green-500/20 bg-green-950/20 p-5 sm:p-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-white">Tips for Earning</h2>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-zinc-300">
          <li>Watch ads completely to earn the full reward.</li>
          <li>Keep the tab open and the video playing. The timer stops when you pause or switch tabs.</li>
          <li>Each ad can be watched once per day. New ads are added regularly.</li>
          <li>Your reward goes straight to your Earning Wallet, so you can withdraw it.</li>
        </ul>
      </section>

      {session && <AdPlayer session={session} onClose={() => { setSession(null); load(); }} onDone={onDone} />}
      {cel && <Celebration {...cel} onClose={() => setCel(null)} />}
    </div>
  );
}

