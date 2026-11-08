import {
  LayoutGrid, Wallet, ArrowDownToLine, ArrowUpFromLine, Receipt, Ticket,
  Play, Layers, ClipboardList, DollarSign, Users, Trophy, User,
} from "lucide-react";

export const NAV = [
  { section: "Overview", items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutGrid }] },
  {
    section: "Finance",
    items: [
      { label: "Wallet", to: "/wallet", icon: Wallet },
      { label: "Deposits", to: "/deposits", icon: ArrowDownToLine },
      { label: "Withdrawals", to: "/withdrawals", icon: ArrowUpFromLine },
      { label: "Transactions", to: "/transactions", icon: Receipt },
      { label: "Promo Codes", to: "/promo-codes", icon: Ticket },
    ],
  },
  {
    section: "Earning",
    items: [
      { label: "Watch Ads", to: "/watch-ads", icon: Play },
      { label: "Plans", to: "/plans", icon: Layers },
      { label: "My Plans", to: "/my-plans", icon: ClipboardList },
      { label: "Earnings", to: "/earnings", icon: DollarSign },
    ],
  },
  {
    section: "Growth",
    items: [
      { label: "Referrals", to: "/referrals", icon: Users },
      { label: "Achievements", to: "/achievements", icon: Trophy },
    ],
  },
  { section: "Account", items: [{ label: "Profile", to: "/profile", icon: User }] },
];

