import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus, Copy, Share2, Mail, Phone, DollarSign, Users, Filter, FileX, Layers, TrendingUp, Gift } from "lucide-react";
import api from "../services/api";
import { money } from "../utils/format";

const FILTERS = [
  ["all", "All"], ["deposit", "With Deposit"], ["no-deposit", "No Deposit"],
  ["plans", "With Plans"], ["no-plans", "No Plans"],
];

const copyText = async (text, label) => {
  try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
  catch { toast.error("Copy failed"); }
};

function CopyField({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 rounded-xl border border-line bg-field px-4 py-2.5">
        <p className="text-xs text-zinc-400">{label}</p>
        <p className="truncate font-mono text-sm text-white">{value}</p>
      </div>
      <button onClick={() => copyText(value, label)} aria-label={`Copy ${label}`}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line bg-field text-zinc-300 hover:bg-zinc-800">
        <Copy className="h-5 w-5" />
      </button>
    </div>
  );
}

function Tile({ value, label, cls = "text-white" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-2 py-4 text-center sm:py-5">
      <p className={`truncate font-display text-sm font-bold sm:text-xl ${cls}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-400 sm:text-sm">{label}</p>
    </div>
  );
}

const Badge = ({ ok, children }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs ${ok ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
    {children}
  </span>
);

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function Referrals() {
  const [s, setS] = useState(null);
  const [tab, setTab] = useState("direct");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    api.get("/referrals/summary")
      .then((r) => setS(r.data))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load referrals"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    api.get("/referrals", { params: { type: tab, filter } })
      .then((r) => !cancelled && setRows(r.data.referrals))
      .catch((e) => !cancelled && toast.error(e.response?.data?.message || "Could not load list"))
      .finally(() => !cancelled && setListLoading(false));
    return () => { cancelled = true; };
  }, [tab, filter]);

  if (!s) return <div className="h-64 animate-pulse rounded-3xl bg-zinc-900" />;

  const link = `${window.location.origin}/register?ref=${s.referralCode}`;
  const share = async () => {
    const data = { title: "Join EarnNest", text: "Join me on EarnNest and start earning!", url: link };
    if (navigator.share) { try { await navigator.share(data); } catch {} }
    else copyText(link, "Link");
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Referrals</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Invite friends and earn commissions</p>
      </div>

      {/* Link */}
      <section className="space-y-3 rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-white">
          <UserPlus className="h-5 w-5 text-brand-400" /> Your Referral Link
        </h2>
        <CopyField label="Code" value={s.referralCode} />
        <CopyField label="Link" value={link} />
        <button onClick={share}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
          <Share2 className="h-4 w-4" /> Share Link
        </button>
      </section>

      {/* Referred by */}
      {s.referredBy && (
        <section className="flex items-center gap-4 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/50 to-purple-950/30 p-4 sm:p-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white">
            {s.referredBy.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-zinc-400">Referred By</p>
            <p className="truncate font-display text-lg font-semibold text-white">{s.referredBy.name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              {s.referredBy.email && <span className="flex items-center gap-1 break-all"><Mail className="h-3 w-3" />{s.referredBy.email}</span>}
              {s.referredBy.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.referredBy.phone}</span>}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <div className="space-y-2 sm:space-y-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Tile value={s.counts.direct} label="Direct" cls="text-blue-400" />
          <Tile value={s.counts.indirect} label="Indirect" cls="text-purple-400" />
          <Tile value={s.counts.inactive} label="Inactive" cls="text-orange-400" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Tile value={money(s.commission.direct)} label="Direct Comm" cls="text-green-400" />
          <Tile value={money(s.commission.indirect)} label="Indirect Comm" cls="text-blue-400" />
          <Tile value={money(s.commission.total)} label="Total Comm" cls="text-green-400" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Tile value={money(s.invest.today)} label="Today Invest" />
          <Tile value={money(s.invest.yesterday)} label="Yesterday Invest" />
          <Tile value={money(s.invest.month)} label="Monthly Invest" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Tile value={money(s.ads.today)} label="Today Ads" />
          <Tile value={money(s.ads.yesterday)} label="Yesterday Ads" />
          <Tile value={money(s.ads.month)} label="Monthly Ads" />
        </div>
      </div>

      {/* Referral wallet */}
      <section className="flex items-center gap-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-green-500/15 text-green-400"><DollarSign className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-zinc-300">Referral Wallet</p>
          <p className="font-display text-2xl font-bold text-green-400">{money(s.referralWallet)}</p>
        </div>
      </section>

      {/* List */}
      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl bg-zinc-900 p-1">
            {[["direct", "Direct", Users], ["indirect", "Indirect", UserPlus]].map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === key ? "bg-brand-500 text-white" : "text-zinc-400 hover:text-white"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-line bg-field px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-brand-500">
              {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {listLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="mb-2 grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><FileX className="h-7 w-7" /></div>
            <p className="font-display text-lg font-semibold text-white">No {tab} referrals</p>
            <p className="text-sm text-zinc-400">
              {tab === "direct" ? "Share your referral link to invite friends" : "Your direct referrals need to invite others"}
            </p>
            {tab === "direct" && (
              <button onClick={share} className="mt-3 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
                Share Link
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-field p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500/15 font-semibold text-brand-400">
                    {r.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{r.name}</p>
                    <p className="truncate text-xs text-zinc-500">{r.email} · Joined {fmtDate(r.joinedAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tab === "indirect" && <Badge ok>L{r.level}</Badge>}
                  <Badge ok={r.hasDeposit}>{r.hasDeposit ? "Deposited" : "No deposit"}</Badge>
                  <Badge ok={r.hasPlan}>{r.hasPlan ? "Has plan" : "No plan"}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

     

     
      {/* Referral rewards */}
      {/* Referral rewards */}
<section className="space-y-5 rounded-3xl border border-line bg-surface p-4 sm:p-6">
  <div>
    <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-white">
      <Gift className="h-5 w-5 text-brand-400" /> Referral Rewards
    </h2>
    <p className="text-sm text-zinc-400">
      Earn a percentage of every plan your team buys. Bonuses go straight to your Referral Wallet.
    </p>
  </div>

  {/* your level */}
  <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-transparent p-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs text-zinc-400">Your direct bonus rate</p>
        <p className="font-display text-4xl font-bold text-white">{s.rate}%</p>
      </div>
      <p className="text-sm text-zinc-300">{s.active} active referral{s.active === 1 ? "" : "s"}</p>
    </div>
    {s.next ? (
      <>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
            style={{ width: `${Math.min((s.active / s.next.min) * 100, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {s.next.min - s.active} more active referral{s.next.min - s.active === 1 ? "" : "s"} to unlock {s.next.rate}%
        </p>
      </>
    ) : (
      <p className="mt-3 text-xs text-brand-400">You have reached the highest level.</p>
    )}
  </div>

  {/* tiers */}
  <div>
    <p className="mb-3 text-sm font-medium text-white">Direct bonus levels</p>
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {s.rules.tiers.map((t, i, arr) => {
        const label = arr[i + 1] ? `${t.min} to ${arr[i + 1].min - 1}` : `${t.min} or more`;
        const current = s.rate === t.rate;
        return (
          <div key={t.min} className={`rounded-xl border p-3 text-center ${current ? "border-brand-500/60 bg-brand-500/10" : "border-line bg-field"}`}>
            <p className="font-display text-xl font-bold text-white sm:text-2xl">{t.rate}%</p>
            <p className="mt-1 text-[11px] text-zinc-400 sm:text-xs">{label} active</p>
          </div>
        );
      })}
    </div>
  </div>

  {/* other rules */}
  <div className="grid gap-3 sm:grid-cols-2">
    <div className="rounded-2xl border border-line bg-field p-4">
      <p className="text-sm font-medium text-white">Repeat purchases</p>
      <p className="mt-1 text-xs text-zinc-400">
        When someone you invited buys another plan, you earn <span className="font-semibold text-white">{s.rules.repurchase}%</span> again.
      </p>
    </div>
    <div className="rounded-2xl border border-line bg-field p-4">
      <p className="text-sm font-medium text-white">Team levels</p>
      <p className="mt-1 text-xs text-zinc-400">
        When your referrals invite others, you earn{" "}
        {s.rules.indirect.map((r, i) => (
          <span key={i}><span className="font-semibold text-white">{r}%</span> (Level {i + 2}){i < s.rules.indirect.length - 1 ? ", " : ""}</span>
        ))}{" "}
        on their first plan.
      </p>
    </div>
  </div>

  <p className="rounded-xl border border-dashed border-zinc-700 p-3 text-center text-xs text-zinc-400">
    People who join with your link get a <span className="font-semibold text-white">Rs {s.rules.welcome} welcome bonus</span> with their first plan.
  </p>
</section>

    </div>
  );
}

