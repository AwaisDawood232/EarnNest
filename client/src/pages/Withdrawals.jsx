import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Wallet, ArrowUpFromLine, X, Loader2, FileX, Info } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { money } from "../utils/format";

const STATUS = {
  pending:  ["Pending", "bg-amber-500/10 text-amber-400"],
  approved: ["Paid", "bg-green-500/10 text-green-400"],
  rejected: ["Rejected", "bg-red-500/10 text-red-400"],
};
const WALLET_LABEL = { earning: "Earning Wallet", referral: "Referral Wallet" };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");
const normAcc = (s) => s.replace(/[\s-]/g, "").replace(/^(\+92|0092|92)/, "0");

function NewWithdrawalModal({ info, defaultName, onClose, onDone }) {
  const [methodId, setMethodId] = useState(info.methods[0]?.id || "");
  const [wallet, setWallet] = useState(info.wallets.earning >= info.wallets.referral ? "earning" : "referral");
  const [amount, setAmount] = useState("");
  const [acc, setAcc] = useState("");
  const [name, setName] = useState(defaultName || "");
  const [busy, setBusy] = useState(false);

  const m = info.methods.find((x) => x.id === methodId);
  const balance = info.wallets[wallet];
  const amt = Number(amount);
  const fee = m && amt > 0 ? Math.round(amt * m.feePercent) / 100 : 0;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const submit = async (e) => {
    e.preventDefault();
    if (!m) return toast.error("Select a withdrawal method");
    if (!(amt > 0)) return toast.error("Enter a valid amount");
    if (amt < m.min || amt > m.max) return toast.error(`Amount must be between ${money(m.min)} and ${money(m.max)}`);
    if (amt > balance) return toast.error("Insufficient balance in the selected wallet");
    if (!/^03\d{9}$/.test(normAcc(acc))) return toast.error("Enter a valid mobile account number (03XXXXXXXXX)");
    if (name.trim().length < 3) return toast.error("Enter the account holder name");

    setBusy(true);
    try {
      await api.post("/withdrawals", { methodId, wallet, amount: amt, accountNumber: normAcc(acc), accountName: name.trim() });
      toast.success("Withdrawal request submitted");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit your request");
      setBusy(false);
    }
  };

  const input = "h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";
  const label = "mb-2 block text-sm font-medium text-zinc-300";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-display text-xl font-bold text-white">New Withdrawal</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl bg-field p-4">
            <p className="text-xs text-zinc-400">Available Balance ({WALLET_LABEL[wallet]})</p>
            <p className="font-display text-2xl font-bold text-white">{money(balance)}</p>
          </div>

          <div>
            <label className={label}>Withdrawal Method</label>
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className={`${input} [color-scheme:dark]`}>
              {info.methods.map((x) => <option key={x.id} value={x.id}>{x.name} ({money(x.min)} - {money(x.max)})</option>)}
            </select>
          </div>

          <div>
            <label className={label}>Withdraw From</label>
            <select value={wallet} onChange={(e) => setWallet(e.target.value)} className={`${input} [color-scheme:dark]`}>
              <option value="earning">Earning Wallet ({money(info.wallets.earning)})</option>
              <option value="referral">Referral Wallet ({money(info.wallets.referral)})</option>
            </select>
          </div>

          <div>
            <label className={label}>Amount</label>
            <div className="relative">
              <input type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${input} pr-20`} />
              <button type="button" onClick={() => m && setAmount(String(Math.max(Math.min(m.max, balance), 0)))}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-400 hover:bg-brand-500/25">Max</button>
            </div>
            {m && <p className="mt-2 text-sm text-zinc-400">Min: {money(m.min)} • Max: {money(m.max)}{m.feePercent > 0 && ` • Fee: ${m.feePercent}%`}</p>}
          </div>

          {amt > 0 && m && (
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-sm">
              <div className="flex justify-between text-zinc-300"><span>Fee</span><span>{money(fee)}</span></div>
              <div className="mt-1 flex justify-between font-semibold text-white"><span>You will receive</span><span>{money(Math.max(amt - fee, 0))}</span></div>
            </div>
          )}

          <p className="pt-1 font-semibold text-white">Account Details</p>
          <div>
            <label className={label}>Account Number</label>
            <input value={acc} onChange={(e) => setAcc(e.target.value)} inputMode="tel" maxLength={16} placeholder="03XXXXXXXXX" className={input} />
          </div>
          <div>
            <label className={label}>Account Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Enter account name" className={input} />
          </div>
          <p className="flex items-start gap-2 text-xs text-zinc-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Check your account details carefully. Payments sent to a wrong account cannot be recovered.
          </p>
        </div>

        <div className="flex gap-3 border-t border-line p-5">
          <button type="button" onClick={onClose} disabled={busy} className="h-12 flex-1 rounded-xl border border-line bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800">Cancel</button>
          <button disabled={busy} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit Withdrawal
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Withdrawals() {
  const { reload } = useOutletContext();
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const closeModal = useCallback(() => setOpen(false), []);

  const load = useCallback(() => {
    api.get("/withdrawals")
      .then((r) => setInfo(r.data))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load withdrawals"));
  }, []);
  useEffect(load, [load]);

  if (!info) return <div className="h-96 animate-pulse rounded-3xl bg-zinc-900" />;

  const canStart = !info.blocked && info.methods.length > 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Withdrawals</h1>
          <p className="mt-1 text-sm text-zinc-400 ">Withdraw your earnings</p>
        </div>
        <button onClick={() => setOpen(true)} disabled={!canStart}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-50 sm:px-5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New </span>Withdrawal
        </button>
      </div>

      {info.blocked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          <span>{info.blocked}</span>
          {info.blocked.includes("plan") && <Link to="/plans" className="font-semibold underline">Browse Plans</Link>}
        </div>
      )}

      <section className="flex items-center gap-4 rounded-3xl border border-line bg-gradient-to-br from-green-950/60 via-surface to-amber-950/30 p-5 sm:p-6">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-400 sm:h-16 sm:w-16"><Wallet className="h-7 w-7" /></div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-300">Available for Withdrawal</p>
          <p className="font-display text-3xl font-bold text-white sm:text-4xl">{money(info.available)}</p>
          <p className="truncate text-xs text-zinc-400">Earning {money(info.wallets.earning)} · Referral {money(info.wallets.referral)}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white sm:text-xl">Withdrawal Methods</h2>
        {info.methods.length === 0 ? (
          <p className="text-sm text-zinc-400">Withdrawals are temporarily unavailable.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {info.methods.map((m) => (
              <div key={m.id} className="rounded-2xl border border-line bg-field p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-400"><ArrowUpFromLine className="h-5 w-5" /></div>
                  <p className="font-display text-lg font-semibold text-white">{m.name}</p>
                </div>
                <p className="mt-3 text-xs text-zinc-400 sm:text-sm">
                  Min: {money(m.min)} • Max: {money(m.max)}{m.feePercent > 0 && ` • Fee ${m.feePercent}%`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white sm:text-xl">Withdrawal History</h2>
        {info.history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="mb-2 grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><FileX className="h-7 w-7" /></div>
            <p className="font-display text-lg font-semibold text-white">No withdrawals yet</p>
            <p className="text-sm text-zinc-400">Your withdrawal history will appear here</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {info.history.map((h) => {
              const [text, cls] = STATUS[h.status] || STATUS.pending;
              return (
                <li key={h.id} className="rounded-xl border border-line bg-field p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{h.methodName} · {money(h.amount)}</p>
                      <p className="truncate text-xs text-zinc-500">To {h.account} · {WALLET_LABEL[h.wallet]}</p>
                      <p className="text-xs text-zinc-500">{fmt(h.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{text}</span>
                  </div>
                  {h.fee > 0 && <p className="mt-2 text-xs text-zinc-400">Fee {money(h.fee)} · You receive {money(h.netAmount)}</p>}
                  {h.status === "approved" && h.paymentRef && <p className="mt-2 text-xs text-green-400">Payment reference: {h.paymentRef}</p>}
                  {h.status === "rejected" && (
                    <p className="mt-2 text-xs text-red-400">{h.reason || "Request rejected"} · {money(h.amount)} returned to your wallet</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open && (
        <NewWithdrawalModal info={info} defaultName={user?.displayName} onClose={closeModal}
          onDone={() => { setOpen(false); load(); reload(); }} />
      )}
    </div>
  );

}

