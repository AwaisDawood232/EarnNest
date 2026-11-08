import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Trophy, X, Loader2 } from "lucide-react";
import api from "../services/api";
import { money } from "../utils/format";

export default function RewardsWalletCard({ balance = 0, onDone }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !busy && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, busy]);

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n >= 1)) return toast.error("Minimum is Rs 1");
    if (n > balance) return toast.error("Insufficient Rewards Wallet balance");
    setBusy(true);
    try {
      await api.post("/wallet/transfer", { amount: n });
      toast.success("Moved to your Earning Wallet");
      setOpen(false); setAmount("");
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not move the funds");
    } finally { setBusy(false); }
  };

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-amber-400"><Trophy className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-zinc-300">Rewards Wallet</p>
            <p className="font-display text-xl font-bold text-white">{money(balance)}</p>
          </div>
        </div>
        <button onClick={() => { setAmount(balance >= 1 ? String(Math.floor(balance)) : ""); setOpen(true); }} disabled={balance < 1}
          className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 sm:w-auto">
          Move to Earning Wallet
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} noValidate onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Move to Earning Wallet</h2>
                <p className="mt-1 text-sm text-zinc-400">Money in your Earning Wallet can be withdrawn.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} aria-label="Close"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="rounded-2xl bg-field p-4">
              <p className="text-xs text-zinc-400">Available in Rewards Wallet</p>
              <p className="font-display text-2xl font-bold text-white">{money(balance)}</p>
            </div>
            <div className="relative">
              <input type="number" inputMode="decimal" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount"
                className="h-12 w-full rounded-xl border border-line bg-field px-4 pr-20 text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
              <button type="button" onClick={() => setAmount(String(balance))}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-400">All</button>
            </div>
            <button disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 font-semibold text-white hover:brightness-110 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Move funds
            </button>
          </form>
        </div>
      )}
    </>
  );
}

