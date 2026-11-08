import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Trophy, Target, Users, Lock, Check, Flame, Gift, Clock, Megaphone, Pin,
  Loader2, Sparkles, Zap, Info, RefreshCw,
} from "lucide-react";
import api from "../services/api";
import { money } from "../utils/format";
import Celebration from "../components/ui/Celebration";
import RewardsWalletCard from "../components/RewardsWalletCard";

const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "");
const ago = (iso) => {
  const m = Math.max(Math.floor((Date.now() - new Date(iso).getTime()) / 60000), 0);
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
};
const left = (ms) => {
  if (ms <= 0) return "ended";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m % 60}m left` : `${m}m left`;
};

const STYLE = {
  claimed: ["border-green-500/30 bg-green-500/5",   "bg-green-500/15 text-green-400",   "CLAIMED"],
  ready:   ["border-amber-400/60 bg-amber-500/10",  "bg-amber-500/20 text-amber-300",   "READY TO CLAIM"],
  current: ["border-blue-500/40 bg-blue-500/5",     "bg-blue-500/15 text-blue-400",     "IN PROGRESS"],
  next:    ["border-purple-500/40 bg-purple-500/5", "bg-purple-500/15 text-purple-400", "NEXT TARGET"],
  locked:  ["border-line bg-surface",               "bg-zinc-800 text-zinc-400",        "LOCKED"],
};

function Bar({ pct, className = "from-amber-500 to-brand-500" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Spinner({ busy, children }) {
  return <>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}</>;
}

/* ---------------- hero ---------------- */
function Hero({ d, busy, onClaim }) {
  const h = d.hero;
  if (!h) {
    return (
      <section className="rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-950/50 to-surface p-6 text-center sm:p-10">
        <p className="text-5xl">🏆</p>
        <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">You completed every level</h2>
        <p className="mt-1 text-sm text-zinc-400">Watch this page for new achievements and events.</p>
      </section>
    );
  }
  const ready = h.status === "ready";
  const Tile = ({ icon: Icon, label, value, target }) => (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="flex items-center gap-2 text-xs text-zinc-400"><Icon className="h-4 w-4 text-blue-400" /> {label}</p>
      <p className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">{money(value)}</p>
      <p className="text-xs text-zinc-500">of {money(target)}</p>
      <div className="mt-2"><Bar pct={target > 0 ? Math.min((value / target) * 100, 100) : 100} className="from-blue-500 to-brand-400" /></div>
    </div>
  );

  return (
    <section className={`relative overflow-hidden rounded-3xl border p-5 sm:p-8 ${ready ? "border-amber-400/60 bg-gradient-to-br from-amber-950/50 via-surface to-green-950/30" : "border-line bg-gradient-to-br from-amber-950/30 via-surface to-green-950/20"}`}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-4xl sm:h-20 sm:w-20 sm:text-5xl">{h.icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-300">{ready ? "You unlocked" : "Working towards"} · Level {h.level}</p>
          <h2 className="truncate font-display text-2xl font-bold text-white sm:text-4xl">{h.name}</h2>
          <p className="text-xs text-zinc-400">{d.level.claimed} of {d.level.total} levels claimed</p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <Tile icon={Target} label="Own Investment" value={d.own} target={h.ownTarget} />
        <Tile icon={Users} label="Team Investment" value={d.team} target={h.teamTarget} />
      </div>

      <div className="relative mt-5">
        <div className="mb-1.5 flex justify-between text-sm text-zinc-300"><span>Progress to {h.name}</span><span className="font-semibold text-white">{h.progress}%</span></div>
        <Bar pct={h.progress} />
      </div>

      <div className="relative mt-5">
        {ready ? (
          <button onClick={() => onClaim(h)} disabled={!!busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500  font-bold text-black shadow-lg shadow-amber-500/20 hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-8">
            <Spinner busy={busy === h.id}><Gift className="h-5 w-5" /></Spinner> Claim {money(h.reward)}
          </button>
        ) : (
          <p className="text-sm text-zinc-300">
            Reward: <span className="font-semibold text-amber-300">{money(h.reward)}</span>
            {h.ownNeed > 0 && <> · <span className="text-zinc-400">Invest {money(h.ownNeed)} more yourself</span></>}
            {h.teamNeed > 0 && <> · <span className="text-zinc-400">Team needs {money(h.teamNeed)} more</span></>}
          </p>
        )}
        {!ready && <Link to="/plans" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-400 hover:underline">Buy a plan to progress →</Link>}
      </div>
    </section>
  );
}

/* ---------------- check-in ---------------- */
function CheckIn({ c, busy, onCheckin }) {
  if (!c.enabled) return null;
  const dots = Array.from({ length: c.streakDays }, (_, i) => i < c.filled);
  const bonusToday = !c.checkedToday && c.filled + 1 === c.streakDays;
  return (
    <section className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/30 to-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl">
          <Flame className="h-5 w-5 text-orange-400" /> Daily Check-in
        </h2>
        <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">🔥 {c.streak}-day streak</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-1.5 sm:gap-3">
        {dots.map((on, i) => {
          const last = i === c.streakDays - 1;
          return (
            <div key={i} className={`grid h-10 min-w-0 flex-1 place-items-center rounded-xl border text-xs font-bold sm:h-12 ${
              on ? "border-orange-400/60 bg-orange-500/20 text-orange-300" : last ? "border-amber-500/40 bg-amber-500/5 text-amber-400" : "border-line bg-field text-zinc-500"}`}>
              {on ? <Check className="h-4 w-4" /> : last ? <Gift className="h-4 w-4" /> : i + 1}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-zinc-400 sm:text-sm">
        {c.blocked ? c.blocked
          : c.checkedToday ? `Done for today! Day ${c.streakDays} pays a ${money(c.streakBonus)} bonus.`
          : bonusToday ? `Today's check-in includes a ${money(c.streakBonus)} streak bonus!`
          : `Check in every day: ${money(c.reward)} daily and a ${money(c.streakBonus)} bonus on day ${c.streakDays}.`}
      </p>

      {c.blocked ? (
        <Link to="/plans" className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">Browse Plans</Link>
      ) : (
        <button onClick={onCheckin} disabled={c.checkedToday || !!busy}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50 sm:w-auto sm:px-8">
          <Spinner busy={busy === "checkin"}><Flame className="h-4 w-4" /></Spinner>
          {c.checkedToday ? "Checked in today" : `Check in · +${money(c.reward)}`}
        </button>
      )}
    </section>
  );
}

/* ---------------- events ---------------- */
function Events({ events, now, busy, onClaim }) {
  if (!events.length) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl">
        <Zap className="h-5 w-5 text-amber-400" /> Events
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((e) => {
          const goal = e.kind === "invest" ? "Your purchases" : "Team purchases";
          return (
            <div key={e.id} className={`rounded-3xl border p-5 ${e.status === "claimable" ? "border-amber-400/60 bg-amber-500/10" : "border-line bg-surface"}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-500/15 text-2xl">{e.icon}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display  font-bold text-white sm:text-lg">{e.title}</h3>
                  {e.description && <p className="mt-0.5 text-xs text-zinc-400 sm:text-sm">{e.description}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">{money(e.reward)}</span>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                  <span>{goal}: {money(e.progress)} / {money(e.target)}</span><span className="text-white">{e.pct}%</span>
                </div>
                <Bar pct={e.pct} className="from-purple-500 to-brand-400" />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="h-3.5 w-3.5" />
                  {e.status === "upcoming" ? `Starts ${fmtDay(e.startsAt)}`
                    : e.status === "claimed" ? "Reward claimed"
                    : e.status === "ended" ? "Event ended"
                    : left(new Date(e.endsAt).getTime() - now)}
                </p>
                {e.status === "claimable" && (
                  <button onClick={() => onClaim(e)} disabled={!!busy}
                    className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 px-5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60">
                    <Spinner busy={busy === e.id}><Gift className="h-4 w-4" /></Spinner> Claim
                  </button>
                )}
                {e.status === "claimed" && <span className="flex items-center gap-1 text-xs font-semibold text-green-400"><Check className="h-4 w-4" /> Done</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- roadmap ---------------- */
function Roadmap({ list, busy, onClaim }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-white sm:text-2xl">Roadmap</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
          {[["bg-green-500", "Claimed"], ["bg-amber-400", "Ready"], ["bg-blue-500", "Current"], ["bg-purple-500", "Next"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{l}</span>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {list.map((a) => {
          const [box, pill, label] = STYLE[a.status];
          const active = a.status === "current" || a.status === "next";
          return (
            <li key={a.id} className={`rounded-2xl border p-3 sm:p-4 ${box}`}>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-black/30 text-3xl sm:h-16 sm:w-16 sm:text-4xl ${a.status === "locked" ? "opacity-40 grayscale" : ""}`}>{a.icon}</div>
                  <span className={`absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-surface text-[11px] font-bold ${pill}`}>{a.level}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <h3 className={`font-display  font-bold sm:text-lg ${a.status === "locked" ? "text-zinc-300" : "text-white"}`}>{a.name}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide sm:text-xs ${pill}`}>
                      {a.status === "locked" && <Lock className="h-3 w-3" />}{a.status === "claimed" && <Check className="h-3 w-3" />}{label}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-400 sm:text-sm">
                    <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />Own: {money(a.ownTarget)}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Team: {money(a.teamTarget)}</span>
                  </p>
                  <p className="mt-1 text-sm font-semibold text-amber-300">Reward {money(a.reward)}</p>
                </div>
              </div>

              {active && <div className="mt-3"><Bar pct={a.progress} className={a.status === "current" ? "from-blue-500 to-brand-400" : "from-purple-500 to-brand-400"} /></div>}
              {a.met && (a.status === "locked" || a.status === "next") && (
                <p className="mt-2 text-xs text-amber-300">Requirements met. Claim the earlier levels first.</p>
              )}
              {a.status === "ready" && (
                <button onClick={() => onClaim(a)} disabled={!!busy}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 font-bold text-black hover:brightness-110 disabled:opacity-60">
                  <Spinner busy={busy === a.id}><Gift className="h-4 w-4" /></Spinner> Claim {money(a.reward)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- page ---------------- */
export default function Achievements() {
  const { reload } = useOutletContext();
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState("");
  const [cel, setCel] = useState(null);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);

  const load = useCallback(() =>
    api.get("/achievements")
      .then((r) => {
        offset.current = new Date(r.data.serverNow).getTime() - Date.now();
        setNow(Date.now() + offset.current);
        setD(r.data); setFailed(false);
      })
      .catch((e) => { setFailed(true); toast.error(e.response?.data?.message || "Could not load achievements"); }),
  []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 30000);
    return () => clearInterval(t);
  }, []);

  const act = async (key, url, celebrate) => {
    setBusy(key);
    try {
      const { data } = await api.post(url);
      setCel(celebrate(data));
      await load();
      reload();
    } catch (e) {
      toast.error(e.response?.data?.message || "Something went wrong");
    } finally { setBusy(""); }
  };

  const claimAch = (a) => act(a.id, `/achievements/${a.id}/claim`, (r) => ({
    icon: r.icon, title: `${r.name} unlocked`, amount: r.reward, subtitle: "Added to your Rewards Wallet",
  }));
  const claimEvent = (e) => act(e.id, `/achievements/events/${e.id}/claim`, (r) => ({
    icon: r.icon, title: r.title, amount: r.reward, subtitle: "Event goal completed. Added to your Rewards Wallet",
  }));
  const doCheckin = () => act("checkin", "/achievements/checkin", (r) => ({
    icon: "🔥", title: `Day ${r.streak} check-in`, amount: r.amount,
    subtitle: r.bonus > 0 ? "Streak bonus included!" : "Come back tomorrow to keep your streak",
  }));

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
        <div className="h-72 rounded-3xl bg-zinc-900" />
        <div className="h-40 rounded-3xl bg-zinc-900" />
        <div className="h-96 rounded-3xl bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Achievements</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Unlock rewards by reaching milestones</p>
      </div>

      <Hero d={d} busy={busy} onClaim={claimAch} />
      <CheckIn c={d.checkin} busy={busy} onCheckin={doCheckin} />
      <Events events={d.events} now={now} busy={busy} onClaim={claimEvent} />
      <Roadmap list={d.achievements} busy={busy} onClaim={claimAch} />

      <section className="grid gap-3 rounded-3xl border border-line bg-gradient-to-r from-green-950/40 via-surface to-amber-950/30 p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <p className="text-sm text-zinc-300">Total Rewards Available</p>
          <p className="font-display text-2xl font-bold text-white sm:text-3xl">{money(d.totals.available)}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-zinc-300">Rewards Claimed</p>
          <p className="font-display text-2xl font-bold text-green-400 sm:text-3xl">{money(d.totals.claimed)}</p>
        </div>
      </section>

      <RewardsWalletCard balance={d.rewardsWallet} onDone={() => { load(); reload(); }} />

      {d.feed.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl"><Sparkles className="h-5 w-5 text-amber-400" /> Recent Achievers</h2>
          <ul className="space-y-2.5">
            {d.feed.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line bg-field p-3 text-sm">
                <span className="text-2xl">{f.icon}</span>
                <p className="min-w-0 flex-1 text-zinc-300"><span className="font-semibold text-white">{f.name}</span> reached <span className="font-semibold text-amber-300">{f.achName}</span></p>
                <span className="shrink-0 text-xs text-zinc-500">{ago(f.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.posts.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl"><Megaphone className="h-5 w-5 text-brand-400" /> Announcements</h2>
          <ul className="space-y-3">
            {d.posts.map((p) => (
              <li key={p.id} className="rounded-2xl border border-line bg-field p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {p.pinned && <Pin className="h-3.5 w-3.5 text-amber-400" />}
                  <h3 className="font-semibold text-white">{p.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.kind === "promo" ? "bg-amber-500/15 text-amber-300" : p.kind === "update" ? "bg-blue-500/15 text-blue-300" : "bg-green-500/15 text-green-300"}`}>{p.kind}</span>
                  <span className="ml-auto text-xs text-zinc-500">{fmtDay(p.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-zinc-300">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-white"><Info className="h-5 w-5 text-blue-400" /> How Achievements Work</h2>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-zinc-300">
          <li>Achievements unlock from your own investment and your team's investment.</li>
          <li>Own investment is the total of the plans you purchased.</li>
          <li>Team investment is the total of the plans your referrals (all levels) purchased.</li>
          <li>Claim levels in order: Level 1, then Level 2, and so on.</li>
          <li>Rewards go to your Rewards Wallet. Move them to your Earning Wallet to withdraw.</li>
          <li>Check in every day to build a streak, and join events for extra rewards.</li>
        </ul>
      </section>

      {cel && <Celebration {...cel} onClose={() => setCel(null)} />}
    </div>
  );
}