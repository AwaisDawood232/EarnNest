import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, Users, Trophy, Inbox, Loader2, RefreshCw,
} from "lucide-react";
import api from "../services/api";
import { money } from "../utils/format";

const TABS = [
  ["all", "All"], ["deposit", "Deposit"], ["earning", "Earning"],
  ["referral", "Referral"], ["rewards", "Rewards"], ["withdrawal", "Withdrawal"],
];

const META = {
  deposit:    { icon: ArrowDownToLine, box: "bg-blue-500/10 text-blue-400" },
  earning:    { icon: TrendingUp,      box: "bg-green-500/10 text-green-400" },
  referral:   { icon: Users,           box: "bg-purple-500/10 text-purple-400" },
  rewards:    { icon: Trophy,          box: "bg-amber-500/10 text-amber-400" },
  withdrawal: { icon: ArrowUpFromLine, box: "bg-red-500/10 text-red-400" },
};

// each tab has its own empty state and button
const EMPTY = {
  all:        { icon: Inbox,           title: "No transactions yet",      text: "Your transaction history will appear here",                          cta: ["Browse Plans", "/plans"] },
  deposit:    { icon: ArrowDownToLine, title: "No deposits yet",          text: "Purchase a plan to make your first deposit",                        cta: ["Browse Plans", "/plans"] },
  earning:    { icon: TrendingUp,      title: "No earnings yet",          text: "Daily rewards appear here once you have an active plan",            cta: ["View My Plans", "/my-plans"] },
  referral:   { icon: Users,           title: "No referral bonuses yet",  text: "Invite friends and earn a bonus when they buy their first plan",    cta: ["Invite Friends", "/referrals"] },
  rewards:    { icon: Trophy,          title: "No rewards yet",           text: "Achievement rewards will appear here when you reach a milestone",   cta: ["View Achievements", "/achievements"] },
  withdrawal: { icon: ArrowUpFromLine, title: "No withdrawals yet",       text: "Your payout requests will appear here",                             cta: ["New Withdrawal", "/withdrawals"] },
};

const SUMMARY = {
  deposit:    "Total deposited (approved)",
  earning:    "Total earned",
  referral:   "Total referral bonus",
  rewards:    "Total rewards",
  withdrawal: "Total withdrawn (paid)",
};

const STATUS = {
  pending:  ["Pending",  "bg-amber-500/10 text-amber-400"],
  approved: ["Approved", "bg-green-500/10 text-green-400"],
  rejected: ["Rejected", "bg-red-500/10 text-red-400"],
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "";
const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

const badgeOf = (t) => {
  if (!["deposit", "withdrawal"].includes(t.category)) return null;
  const s = STATUS[t.status];
  if (!s) return null;
  return [t.category === "withdrawal" && t.status === "approved" ? "Paid" : s[0], s[1]];
};

export default function TransactionList({ initial = 20, loadMore = true, refreshKey = 0, syncUrl = false }) {
  const [params, setParams] = useSearchParams();
  const [localCat, setLocalCat] = useState("all");
  const urlTab = params.get("tab");
  const category = syncUrl ? (TABS.some(([k]) => k === urlTab) ? urlTab : "all") : localCat;

  const [limit, setLimit] = useState(initial);
  const [items, setItems] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState(null);
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [people, setPeople] = useState(null);
  const activeTab = useRef(null);

  const showPeople = loadMore; // the full page shows invited people, the Wallet preview stays compact

  const pickTab = (key) => {
    if (key === category) return;
    setLimit(initial);
    setItems(null);
    setSummary(null);
    if (syncUrl) setParams(key === "all" ? {} : { tab: key }, { replace: true });
    else setLocalCat(key);
  };

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setFailed(false);
    api.get("/transactions", { params: { category, limit } })
      .then((r) => {
        if (cancelled) return;
        setItems(r.data.items);
        setHasMore(r.data.hasMore);
        setSummary(r.data.summary);
        setCounts(r.data.counts);
      })
      .catch((e) => {
        if (cancelled) return;
        setFailed(true);
        toast.error(e.response?.data?.message || "Could not load transactions");
      })
      .finally(() => !cancelled && setBusy(false));
    return () => { cancelled = true; };
  }, [category, limit, refreshKey, retry]);

  // people you invited (Referral tab only)
  useEffect(() => {
    if (category !== "referral" || !showPeople) return;
    api.get("/referrals", { params: { type: "direct", filter: "all" } })
      .then((r) => setPeople(r.data.referrals))
      .catch(() => setPeople([]));
  }, [category, showPeople, refreshKey]);

  // keep the selected tab visible on phones
  useEffect(() => {
    activeTab.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [category]);

  const empty = EMPTY[category];
  const EmptyIcon = empty.icon;
  const emptyText =
    category === "referral" && people?.length > 0
      ? "You will earn a bonus when the friends you invited buy their first plan"
      : empty.text;

  return (
    <div>
      {/* tabs */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-1 rounded-xl border border-line bg-base p-1 lg:min-w-0">
          {TABS.map(([key, label]) => {
            const active = category === key;
            return (
              <button key={key} ref={active ? activeTab : null} onClick={() => pickTab(key)}
                aria-pressed={active}
                className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  active ? "bg-brand-600 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}>
                {label}
                {key !== "all" && counts[key] > 0 && (
                  <span className={`rounded-full px-1.5 text-[11px] font-semibold ${active ? "bg-white/20" : "bg-zinc-800 text-zinc-300"}`}>
                    {counts[key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* tab summary */}
      {summary && counts[category] > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-field p-4">
          <div className="flex items-center gap-3">
            {(() => { const { icon: I, box } = META[category]; return <div className={`grid h-11 w-11 place-items-center rounded-xl ${box}`}><I className="h-5 w-5" /></div>; })()}
            <div>
              <p className="text-xs text-zinc-400">{SUMMARY[category]}</p>
              <p className="font-display text-xl font-bold text-white">{money(summary.total)}</p>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-400">
            <p>{counts[category]} record{counts[category] > 1 ? "s" : ""}</p>
            {summary.pending > 0 && <p className="mt-0.5 font-medium text-amber-400">{summary.pending} pending</p>}
          </div>
        </div>
      )}

      {/* list */}
      <div className="mt-5">
        {failed ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-zinc-400">We could not load your transactions.</p>
            <button onClick={() => setRetry((n) => n + 1)}
              className="flex items-center gap-2 rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : !items ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="mb-2 grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><EmptyIcon className="h-7 w-7" /></div>
            <p className="font-display text-lg font-semibold text-white">{empty.title}</p>
            <p className="max-w-sm text-sm text-zinc-400">{emptyText}</p>
            <Link to={empty.cta[1]}
              className="mt-3 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600">
              {empty.cta[0]}
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((t) => {
                const { icon: Icon, box } = META[t.category];
                const badge = badgeOf(t);
                return (
                  <li key={`${t.category}-${t.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-field p-3 sm:gap-4 sm:p-4">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${box}`}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white ">{t.title}</p>
                      {t.note && <p className="truncate text-xs text-zinc-500">{t.note}</p>}
                      <p className="text-xs text-zinc-500">{fmt(t.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-display text-sm font-bold  ${
                        t.status === "rejected" ? "text-zinc-500 line-through"
                        : t.direction === "in" ? "text-green-400"
                        : t.direction === "out" ? "text-red-400"
                        : "text-white"
                      }`}>
                        {t.direction === "in" ? "+" : t.direction === "out" ? "-" : ""}{money(t.amount)}
                      </p>
                      {badge && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${badge[1]}`}>{badge[0]}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>

            {loadMore && hasMore && (
              <button onClick={() => setLimit((n) => n + 20)} disabled={busy}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Load more
              </button>
            )}
          </>
        )}
      </div>

      {/* people you invited */}
      {category === "referral" && showPeople && people && (
        <div className="mt-8 border-t border-line pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-white sm:text-lg">
              People you invited <span className="text-zinc-500">({people.length})</span>
            </h3>
            <Link to="/referrals" className="text-sm text-brand-400 hover:underline">View all</Link>
          </div>

          {people.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-5 text-center text-sm text-zinc-400">
              Nobody has joined with your link yet. Share it from the{" "}
              <Link to="/referrals" className="text-brand-400 hover:underline">Referrals page</Link>.
            </p>
          ) : (
            <ul className="space-y-3">
              {people.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-field p-3 sm:p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-purple-500/15 font-semibold text-purple-400">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{p.name}</p>
                    <p className="truncate text-xs text-zinc-500">{p.email} · Joined {fmtDay(p.joinedAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.hasPlan ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
                    {p.hasPlan ? "Plan purchased" : "Waiting for plan"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}