import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, CalendarDays, TrendingUp, Clock, Zap } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { money } from "../utils/format";

const DAY = 864e5;
const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

const STATUS = {
  active: "bg-green-500/15 text-green-400",
  completed: "bg-blue-500/15 text-blue-400",
  cancelled: "bg-zinc-700 text-zinc-300",
};

const pad = (n) => String(n).padStart(2, "0");
const clock = (ms) => {
  const s = Math.max(Math.floor(ms / 1000), 0);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

function Stat({ icon: Icon, label, value, cls = "text-white" }) {
  return (
    <div className="rounded-xl border border-line bg-field p-3">
      <p className="flex items-center gap-1.5 text-xs text-zinc-400"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className={`mt-1 truncate font-display text-sm font-bold  ${cls}`}>{value}</p>
    </div>
  );
}

// grows every second, but is only added to the balance when the 24 hours finish
function LiveReward({ plan, now }) {
  const start = new Date(plan.periodStart).getTime();
  const due = new Date(plan.nextRewardAt).getTime();
  const fraction = Math.min(Math.max((now - start) / DAY, 0), 1);
  const amount = plan.dailyProfit * fraction;

  return (
    <div className="mt-5 rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-transparent p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-400">
          <Zap className="h-3.5 w-3.5" /> Earning now
        </p>
        <p className="text-xs text-zinc-400">Added to balance in <span className="font-mono font-semibold text-white">{clock(due - now)}</span></p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
        Rs {amount.toLocaleString("en-PK", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: `${fraction * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Of {money(plan.dailyProfit)} today. The full amount is credited to your Earning Wallet after 24 hours.
      </p>
    </div>
  );
}

export default function MyPlans() {
  const [plans, setPlans] = useState(null);
  const [offset, setOffset] = useState(0);     // server time minus this device's time
  const [now, setNow] = useState(Date.now());
  const lastReload = useRef(0);

  const load = useCallback(() => {
    lastReload.current = Date.now();
    api.get("/plans/mine")
      .then((r) => {
        setPlans(r.data.plans);
        setOffset(new Date(r.data.serverNow).getTime() - Date.now());
      })
      .catch((e) => toast.error(e.response?.data?.message || "Could not load your plans"));
  }, []);

  useEffect(load, [load]);

  // tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);

  // when a countdown finishes, reload so the server credits the reward
  useEffect(() => {
    if (!plans) return;
    const overdue = plans.some((p) => p.nextRewardAt && now >= new Date(p.nextRewardAt).getTime());
    if (overdue && Date.now() - lastReload.current > 15000) load();
  }, [now, plans, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">My Plans</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Track your active plans and daily rewards</p>
      </div>

      {!plans ? (
        <div className="grid gap-4 lg:grid-cols-2">{[...Array(2)].map((_, i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-zinc-900" />)}</div>
      ) : plans.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><ClipboardList className="h-7 w-7" /></div>
          <p className="font-display text-lg font-semibold text-white">No plans yet</p>
          <p className="text-sm text-zinc-400">Purchase a plan to start receiving daily rewards</p>
          <Link to="/plans" className="mt-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Browse Plans</Link>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((p) => {
            const pct = Math.round((p.daysPaid / p.durationDays) * 100);
            return (
              <section key={p.id} className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">{p.name}</h2>
                    <p className="text-sm text-zinc-400">Invested {money(p.amount)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS[p.status] || STATUS.active}`}>{p.status}</span>
                </div>

                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                    <span>{p.daysPaid} of {p.durationDays} days paid</span><span className="text-white">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {p.status === "active" && p.nextRewardAt && <LiveReward plan={p} now={now} />}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Stat icon={TrendingUp} label="Daily reward" value={money(p.dailyProfit)} cls="text-brand-400" />
                  <Stat icon={TrendingUp} label="Earned so far" value={money(p.earned)} cls="text-brand-400" />
                  <Stat icon={CalendarDays} label="Days left" value={p.daysLeft} />
                  <Stat icon={TrendingUp} label="Total return" value={money(p.totalProfit)} />
                </div>

                <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="h-3.5 w-3.5" />
                  {p.status === "active" ? `Next reward: ${fmt(p.nextRewardAt)}` : `Completed: ${fmt(p.endsAt)}`}
                </p>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}