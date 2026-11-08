import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Wallet as WalletIcon, TrendingUp, Users, Trophy } from "lucide-react";
import StatCard from "../components/ui/StatCard";
import TransactionList from "../components/TransactionList";
import { money } from "../utils/format";
import RewardsWalletCard from "../components/RewardsWalletCard";

export default function Wallet() {
  const { data, loading, reload } = useOutletContext();
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const refresh = async () => {
    setSpinning(true);
    await reload();
    setRefreshKey((k) => k + 1);
    setSpinning(false);
  };

  if (loading || !data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-1/3 rounded-lg bg-zinc-800" />
        <div className="h-48 rounded-3xl bg-zinc-900" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-zinc-900" />)}</div>
      </div>
    );
  }

  const w = data.wallets;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Wallet</h1>
          <p className="mt-1 text-sm text-zinc-400 ">Manage your funds</p>
        </div>
        <button onClick={refresh} disabled={spinning}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* balance */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-green-950/60 via-surface to-amber-950/30 px-4 py-8 text-center sm:py-10">
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />
        <p className="relative text-sm text-zinc-300">Total Balance</p>
        <p className="relative mt-2 font-display text-4xl font-bold text-white sm:text-6xl">{money(data.totalBalance)}</p>
        <div className="relative mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/plans" className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
            <ArrowDownToLine className="h-4 w-4" /> Deposit
          </Link>
          <Link to="/withdrawals" className="flex items-center gap-2 rounded-xl border border-line bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </section>

      {/* wallets */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={WalletIcon} tone="blue"   label="Deposit Wallet"  value={money(w.deposit)} />
        <StatCard icon={TrendingUp} tone="green"  label="Earning Wallet"  value={money(w.earning)} />
        <StatCard icon={Users}      tone="purple" label="Referral Wallet" value={money(w.referral)} />
        <StatCard icon={Trophy}     tone="amber"  label="Rewards Wallet"  value={money(w.rewards)} />
        
      </section>
      
      <RewardsWalletCard balance={w.rewards} onDone={reload} />


      {/* recent transactions */}
      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white sm:text-2xl">Recent Transactions</h2>
          <Link to="/transactions" className="text-sm text-brand-400 hover:underline">View All</Link>
        </div>
        <TransactionList initial={5} loadMore={false} refreshKey={refreshKey} />
      </section>
    </div>
  );
}
