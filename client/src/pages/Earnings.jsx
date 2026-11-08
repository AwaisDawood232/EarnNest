import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { DollarSign, TrendingUp, Eye, CalendarDays, Inbox, Loader2, Clock } from "lucide-react";
import api from "../services/api";
import StatCard from "../components/ui/StatCard";
import { money } from "../utils/format";

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "";
const weekday = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

function Chart({ data }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const hasAny = data.some((d) => d.amount > 0);
  return (
    <div>
      <div className="flex h-36 items-end gap-2 sm:h-44 sm:gap-3">
        {data.map((d) => (
          <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${d.date}: ${money(d.amount)}`}>
            <span className="hidden text-[10px] text-zinc-500 sm:block">{d.amount > 0 ? Math.round(d.amount).toLocaleString() : ""}</span>
            <div
              className={`w-full rounded-t-lg ${d.amount > 0 ? "bg-gradient-to-t from-brand-600 to-brand-400" : "bg-zinc-800"}`}
              style={{ height: `${d.amount > 0 ? Math.max((d.amount / max) * 100, 6) : 4}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {data.map((d) => <span key={d.date} className="flex-1 text-center text-[11px] text-zinc-500 sm:text-xs">{weekday(d.date)}</span>)}
      </div>
      {!hasAny && <p className="mt-3 text-center text-xs text-zinc-500">No rewards in the last 7 days</p>}
    </div>
  );
}

export default function Earnings() {
  const { reload } = useOutletContext();
  const [limit, setLimit] = useState(20);
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    api.get("/earnings", { params: { limit } })
      .then((r) => { if (!cancelled) { setD(r.data); if (limit === 20) reload(); } })
      .catch((e) => !cancelled && toast.error(e.response?.data?.message || "Could not load earnings"))
      .finally(() => !cancelled && setBusy(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Earnings</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Track your daily plan rewards</p>
      </div>

      {!d ? (
        <div className="animate-pulse space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-900" />)}</div>
          <div className="h-56 rounded-3xl bg-zinc-900" />
          <div className="h-72 rounded-3xl bg-zinc-900" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard layout="row" icon={DollarSign}   tone="green"  label="Today"           value={money(d.stats.today)} />
            <StatCard layout="row" icon={TrendingUp}   tone="blue"   label="Total"           value={money(d.stats.total)} />
            <StatCard layout="row" icon={Eye}          tone="purple" label="Today's Rewards" value={d.stats.todayRewards} />
            <StatCard layout="row" icon={CalendarDays} tone="amber"  label="Total Rewards"   value={d.stats.totalRewards} />
          </section>

          {/* expected income */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 sm:p-5">
            {d.daily.plans > 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-400"><Clock className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm text-zinc-300">Expected daily income</p>
                    <p className="font-display text-xl font-bold text-white">{money(d.daily.amount)}</p>
                  </div>
                </div>
                <Link to="/my-plans" className="text-sm font-medium text-brand-400 hover:underline">
                  From {d.daily.plans} active plan{d.daily.plans > 1 ? "s" : ""} →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-300">You have no active plan. Purchase one to start earning daily rewards.</p>
                <Link to="/plans" className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Browse Plans</Link>
              </>
            )}
          </section>

          {/* chart */}
          <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-white sm:text-xl">Last 7 Days</h2>
            <Chart data={d.chart} />
          </section>

          {/* history */}
          <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-white sm:text-xl">Earning History</h2>

            {d.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <div className="mb-2 grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><Inbox className="h-7 w-7" /></div>
                <p className="font-display text-lg font-semibold text-white">No earnings yet</p>
                <p className="text-sm text-zinc-400">Your daily rewards will appear here once a plan is active</p>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {d.items.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-field p-3 sm:gap-4 sm:p-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-500/10 text-green-400 sm:h-11 sm:w-11"><TrendingUp className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white ">Daily reward · {t.planName}</p>
                        <p className="truncate text-xs text-zinc-500">{t.days} day{t.days > 1 ? "s" : ""} of earnings</p>
                        <p className="text-xs text-zinc-500">{fmt(t.createdAt)}</p>
                      </div>
                      <p className="shrink-0 font-display text-sm font-bold text-green-400 ">+{money(t.amount)}</p>
                    </li>
                  ))}
                </ul>

                {d.hasMore && (
                  <button onClick={() => setLimit((n) => n + 20)} disabled={busy}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Load more
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

