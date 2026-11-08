import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Ticket, Gift, Wallet, Copy, Check, Loader2, Clock, RefreshCw } from "lucide-react";
import api from "../services/api";
import { money } from "../utils/format";
import Celebration from "../components/ui/Celebration";
import CommunityLinks from "../components/CommunityLinks";

const APPLIES = {
  first: "On your very first deposit, once",
  repeat: "On each deposit after your first",
  any: "On any deposit",
};
const bonusLabel = (c) => (c.type === "percent" ? `${c.value}%` : money(c.value));
const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");
const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "");

export default function PromoCodes() {
  const { data, reload } = useOutletContext();
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [cel, setCel] = useState(null);

  const load = useCallback(() =>
    api.get("/promos")
      .then((r) => { setInfo(r.data); setFailed(false); })
      .catch((e) => { setFailed(true); toast.error(e.response?.data?.message || "Could not load promo codes"); }),
  []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 3) return toast.error("Enter your promo code");
    setBusy(true);
    try {
      const { data: r } = await api.post("/promos/claim", { code: c });
      setCel({ icon: "🎁", title: "Bonus claimed", amount: r.bonus, subtitle: `Code ${r.code} on your ${r.planName} deposit. Added to your Earning Wallet.` });
      setCode("");
      await load();
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not claim this code");
    } finally { setBusy(false); }
  };

  const copy = async (c) => {
    try { await navigator.clipboard.writeText(c); setCopied(c); setTimeout(() => setCopied(""), 1500); }
    catch { toast.error("Copy failed"); }
  };

  if (failed && !info) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-zinc-400">We could not load this page.</p>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-10 w-1/2 rounded-lg bg-zinc-800" />
        <div className="h-44 rounded-3xl bg-zinc-900" />
        <div className="grid gap-4 sm:grid-cols-2"><div className="h-36 rounded-2xl bg-zinc-900" /><div className="h-36 rounded-2xl bg-zinc-900" /></div>
      </div>
    );
  }

  const days = info.claimWindowDays;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Promo Codes</h1>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">Got a promo code? Enter it to get a bonus on your deposit.</p>
      </div>

      {/* claim */}
      <section className="rounded-3xl border border-line bg-gradient-to-br from-green-950/50 via-surface to-amber-950/30 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 sm:h-14 sm:w-14"><Ticket className="h-6 w-6 sm:h-7 sm:w-7" /></div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-white sm:text-xl">Claim your bonus</h2>
            <p className="text-sm text-zinc-400">The bonus is added to your Earning Wallet straight away.</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
            maxLength={20} placeholder="ENTER CODE" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            className="h-14 min-w-0 flex-1 rounded-xl border border-line bg-base px-4 font-mono text-base font-semibold uppercase tracking-[0.25em] text-white outline-none placeholder:tracking-[0.25em] placeholder:text-zinc-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          <button disabled={busy || code.length < 3}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-50">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />} Claim bonus
          </button>
        </form>
      </section>

      {/* available */}
      {info.available.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-white sm:text-xl">Available bonuses</h2>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {info.available.map((c) => (
              <div key={c.code} className={`rounded-2xl border bg-surface p-4 sm:p-5 ${c.used ? "border-line opacity-60" : "border-line"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-white sm:text-lg">{c.title}</h3>
                    <p className="text-sm text-zinc-400">{c.description || APPLIES[c.applies]}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-500/15 px-3 py-1 text-sm font-bold text-green-400">{bonusLabel(c)}</span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-zinc-300"><Wallet className="h-4 w-4 text-zinc-500" /> Paid into your earning wallet</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {APPLIES[c.applies]}
                  {c.minDeposit > 0 && ` · Min deposit ${money(c.minDeposit)}`}
                  {c.maxBonus > 0 && c.type === "percent" && ` · Up to ${money(c.maxBonus)}`}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => copy(c.code)} disabled={c.used}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-600 px-3 py-1.5 font-mono text-sm font-semibold tracking-widest text-white hover:border-brand-500 disabled:opacity-60">
                    {c.code} {copied === c.code ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-zinc-400" />}
                  </button>
                  <span className="text-xs text-zinc-500">
                    {c.used ? "Already used" : c.left != null ? `${c.left} left` : c.expiresAt ? `Until ${fmtDay(c.expiresAt)}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-zinc-500">
        A bonus can be claimed on a deposit approved in the last {days} day{days > 1 ? "s" : ""}. Each deposit can get one bonus.{" "}
        <Link to="/plans" className="font-medium text-brand-400 hover:underline">Make a deposit</Link>
      </p>

      {/* recent deposits */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-white sm:text-xl">Your recent deposits</h2>
        {info.recent.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-zinc-400">
            No deposit was approved in the last {days} day{days > 1 ? "s" : ""}. <Link to="/plans" className="text-brand-400 hover:underline">Browse plans</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {info.recent.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">{d.planName} · {money(d.amount)} {d.first && <span className="ml-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-300">First deposit</span>}</p>
                  <p className="flex items-center gap-1.5 text-xs text-zinc-500"><Clock className="h-3 w-3" /> Approved {fmt(d.approvedAt)}{!d.promoCode && ` · Claim by ${fmtDay(d.claimBy)}`}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${d.promoCode ? "bg-zinc-800 text-zinc-300" : "bg-green-500/10 text-green-400"}`}>
                  {d.promoCode ? `Bonus claimed · ${d.promoCode}` : "Eligible for a bonus"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* history */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-white sm:text-xl">Your bonuses</h2>
        {info.history.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-zinc-300">Bonuses you get appear here.</div>
        ) : (
          <ul className="space-y-3">
            {info.history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400"><Gift className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{h.code}</p>
                  <p className="truncate text-xs text-zinc-500">On {h.planName} · {money(h.depositAmount)} · {fmt(h.createdAt)}</p>
                </div>
                <p className="shrink-0 font-display font-bold text-green-400">+{money(h.bonus)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CommunityLinks community={data?.community} title="Need help with a code?" text="Message the admin or join the community on WhatsApp." />

      {cel && <Celebration {...cel} onClose={() => setCel(null)} />}
    </div>
  );
}

