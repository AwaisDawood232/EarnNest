import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowDownToLine, ArrowUpFromLine, DollarSign, Wallet, TrendingUp, Users, Trophy,
  Eye, Play, Sparkles, Clock, ArrowRight, Megaphone,
} from "lucide-react";
import StatCard from "../components/ui/StatCard";
import { money } from "../utils/format";
import CommunityLinks from "../components/CommunityLinks";


const ACTIONS = [
  { to: "/watch-ads",    icon: Play,       title: "Watch Ads",      sub: "Earn now",          cls: "border-green-500/20 bg-green-500/10 text-green-400" },
  { to: "/plans",        icon: TrendingUp, title: "Buy Plan",       sub: "Increase earnings", cls: "border-blue-500/20 bg-blue-500/10 text-blue-400" },
  { to: "/referrals",    icon: Users,      title: "Invite Friends", sub: "Earn commissions",  cls: "border-purple-500/20 bg-purple-500/10 text-purple-400" },
  { to: "/achievements", icon: Trophy,     title: "Achievements",   sub: "Claim rewards",     cls: "border-amber-500/20 bg-amber-500/10 text-amber-400" },
];

const pct = (c, t) => Math.min(100, Math.round((c / t) * 100)) || 0;

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-2/3 rounded-lg bg-zinc-800" />
      <div className="h-48 rounded-3xl bg-zinc-900" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-zinc-900" />)}
      </div>
    </div>
  );
}

function Progress({ label, value }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm text-zinc-400">
        <span>{label}</span><span className="text-white">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-brand-500 transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading } = useOutletContext();
  if (loading) return <Skeleton />;
  if (!data) return <p className="text-zinc-400">Could not load your dashboard. Refresh the page.</p>;

  // const { user, wallets, stats, activePlans, nextAchievement: a  } = data;
  const { user, wallets, stats, activePlans, nextAchievement: a, announcement, community  } = data;

  const firstName = (user.fullName || "there").split(" ")[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        {/* <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Welcome back, {firstName}!</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Here's your earnings overview</p> */}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
  Welcome back, {firstName}!
</h1>
{announcement && (
  <Link to="/achievements" className="flex items-start gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 transition hover:bg-brand-500/15">
    <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
    <div className="min-w-0">
      <p className="truncate font-semibold text-white">{announcement.title}</p>
      <p className="line-clamp-2 text-sm text-zinc-300">{announcement.body}</p>
    </div>
  </Link>
)}
<p className="mt-1 text-sm text-zinc-400">
  Here's your earnings overview
</p>
      </div>
      

      {/* Balance */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-green-950/60 via-surface to-amber-950/30 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
        <p className="relative flex items-center gap-2 text-sm text-zinc-300">
          <DollarSign className="h-4 w-4 text-brand-400" /> Total Balance
        </p>
        <p className="relative mt-2 break-words font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
  {money(data.totalBalance)}
</p>
        <div className="relative mt-5 flex flex-wrap gap-3">
          <Link to="/deposits" className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
            <ArrowDownToLine className="h-4 w-4" /> Deposit
          </Link>
          <Link to="/withdrawals" className="flex items-center gap-2 rounded-xl border border-line bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </section>
      <CommunityLinks community={community} />

      {/* Wallets */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet}     tone="blue"   label="Deposit Wallet"  value={money(wallets.deposit)} />
        <StatCard icon={TrendingUp} tone="green"  label="Earning Wallet"  value={money(wallets.earning)} />
        <StatCard icon={Users}      tone="purple" label="Referral Wallet" value={money(wallets.referral)} />
        <StatCard icon={Trophy}     tone="amber"  label="Rewards Wallet"  value={money(wallets.rewards)} />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard layout="row" icon={DollarSign} tone="green"  label="Today's Earnings"   value={money(stats.todayEarnings)} />
        <StatCard layout="row" icon={Eye}        tone="blue"   label="Ads Watched Today"  value={stats.adsWatchedToday} />
        <StatCard layout="row" icon={Users}      tone="purple" label="Direct Referrals"   value={stats.directReferrals} />
        <StatCard layout="row" icon={TrendingUp} tone="amber"  label="Total Earnings"     value={money(stats.totalEarnings)} />
      </section>

      {/* Quick actions + plans */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl">
            <Sparkles className="h-5 w-5 text-amber-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {ACTIONS.map(({ to, icon: Icon, title, sub, cls }) => (
              <Link key={to} to={to} className={`rounded-2xl border p-4 transition hover:brightness-125 sm:p-5 ${cls}`}>
                <Icon className="h-6 w-6" />
                <p className="mt-3 text-sm font-semibold text-white sm:mt-5 sm:text-white ">{title}</p>
                <p className="text-xs text-zinc-400 sm:text-sm">{sub}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl">
              <Clock className="h-5 w-5 text-brand-400" /> Active Plans
            </h2>
            <Link to="/my-plans" className="text-sm text-brand-400 hover:underline">View All</Link>
          </div>
          {activePlans.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-zinc-400">No active plans</p>
              <Link to="/plans" className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
                Browse Plans
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {activePlans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-line bg-field p-3 text-sm">
                  <span className="text-white">{p.name}</span>
                  <span className="text-brand-400">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Next achievement */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl">
            <Trophy className="h-5 w-5 text-amber-400" /> Next Achievement
          </h2>
          <Link to="/achievements" className="flex items-center gap-1 text-sm text-brand-400 hover:underline">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-4 sm:p-5">
          <div>
            <p className="font-display text-lg font-semibold text-white">{a.title}</p>
            <p className="text-sm text-zinc-400">Reward: {money(a.reward)}</p>
          </div>
          <Progress label="Own Investment"  value={pct(a.own.current, a.own.target)} />
          <Progress label="Team Investment" value={pct(a.team.current, a.team.target)} />
        </div>
      </section>
    </div>
  );
}