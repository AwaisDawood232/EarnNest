import { NavLink, useLocation } from "react-router-dom";
import { Home, Wallet, LineChart, Users, User } from "lucide-react";

// `match` lists every path that should highlight the tab
const TABS = [
  { label: "Home",    to: "/dashboard", icon: Home,      match: ["/dashboard"] },
  { label: "Deposit", to: "/deposits",  icon: Wallet,    match: ["/deposits", "/plans"] },
  { label: "My Plan", to: "/my-plans",  icon: LineChart, match: ["/my-plans"] },
  { label: "Team",    to: "/referrals", icon: Users,     match: ["/referrals"] },
  { label: "Profile", to: "/profile",   icon: User,      match: ["/profile"] },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 px-3 lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between rounded-3xl border border-line bg-surface/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {TABS.map(({ label, to, icon: Icon, match }) => {
          const active = match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition ${
                  active ? "bg-brand-500/15 text-brand-400" : "text-zinc-500 active:bg-zinc-800"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
