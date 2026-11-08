import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, X, ShieldCheck, SlidersHorizontal, Users, ArrowUpFromLine, Sparkles, Ticket, MessageCircle, Film, Landmark } from "lucide-react";
import logo from "../../assets/images/logo.svg";
import { NAV } from "../../config/navigation";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ open, onClose, isAdmin, notif }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const groups = isAdmin
    ? [
        ...NAV,
        {
          section: "Admin",
          items: [
            { label: "Members", to: "/admin/members", icon: Users },
            { label: "Review Payments", to: "/admin/deposits", icon: ShieldCheck },
            { label: "Withdrawal Requests", to: "/admin/withdrawals", icon: ArrowUpFromLine },
            { label: "Manage Plans", to: "/admin/plans", icon: SlidersHorizontal },
            { label: "Engagement", to: "/admin/achievements", icon: Sparkles },
            { label: "Promo Codes", to: "/admin/promos", icon: Ticket },
            { label: "Community Links", to: "/admin/community", icon: MessageCircle },
            { label: "Ads Manager", to: "/admin/ads", icon: Film },
            { label: "Payment Accounts", to: "/admin/payments", icon: Landmark },
          ],
        },
      ]
    : NAV;

  const badges = { "/admin/deposits": notif?.deposits || 0, "/admin/withdrawals": notif?.withdrawals || 0 };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-base transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="EarnNest" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-xl font-bold text-white">EarnNest</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{group.section}</p>
              <ul className="space-y-1">
                {group.items.map(({ label, to, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? "border-brand-500/40 bg-brand-500/10 text-white"
                            : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                        }`
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badges[to] > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                          {badges[to]}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}