import { useState } from "react";
import { Menu, Wallet, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { money } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";

export default function Topbar({ onMenu, balance, avatar, isAdmin, notif }) {
  const { user } = useAuth();
  const [bell, setBell] = useState(false);
  const name = user?.displayName || user?.email || "U";
  const total = isAdmin ? (notif?.deposits || 0) + (notif?.withdrawals || 0) : 0;

  const items = [
    ["/admin/withdrawals", "Withdrawal requests", notif?.withdrawals || 0],
    ["/admin/deposits", "Payments to review", notif?.deposits || 0],
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-base/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button onClick={onMenu} className="relative rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 lg:hidden" aria-label="Open menu">
        <Menu className="h-6 w-6" />
        {total > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        {isAdmin && (
          <div className="relative">
            <button onClick={() => setBell((b) => !b)} aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-zinc-300 hover:text-white">
              <Bell className="h-5 w-5" />
              {total > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {total > 99 ? "99+" : total}
                </span>
              )}
            </button>
            {bell && (
              <>
                <button aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setBell(false)} />
                <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 shadow-2xl shadow-black/60">
                  {total === 0 && <p className="p-3 text-sm text-zinc-400">Nothing waiting for review.</p>}
                  {items.map(([to, label, count]) => count > 0 && (
                    <Link key={to} to={to} onClick={() => setBell(false)}
                      className="flex items-center justify-between rounded-xl p-3 text-sm text-white hover:bg-zinc-800">
                      {label}
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold">{count}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <Link to="/wallet" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-white">
          <Wallet className="h-4 w-4 text-brand-400" />
          {money(balance)}
        </Link>
        <Link to="/profile" aria-label="Profile" className="shrink-0">
          <Avatar src={avatar} name={name} />
        </Link>
      </div>
    </header>
  );
}