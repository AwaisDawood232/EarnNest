import TransactionList from "../components/TransactionList";

export default function Transactions() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Transaction History</h1>
        <p className="mt-1 text-sm text-zinc-400 ">View all your transactions</p>
      </div>
      <section className="min-h-[24rem] rounded-3xl border border-line bg-surface p-4 sm:p-6">
        
        <TransactionList initial={20} loadMore syncUrl />
      </section>
    </div>
  );
}

