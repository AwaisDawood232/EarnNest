import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute, { PublicRoute } from "./routes/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { NAV } from "./config/navigation";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import Referrals from "./pages/Referrals";
import Plans from "./pages/Plans";
import Checkout from "./pages/Checkout";
import Deposits from "./pages/Deposits";
import Profile from "./pages/Profile";
import MyPlans from "./pages/MyPlans";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminMembers from "./pages/admin/AdminMembers";
import Wallet from "./pages/Wallet";
import Transactions from "./pages/Transactions";
import Withdrawals from "./pages/Withdrawals";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import Earnings from "./pages/Earnings";
import Achievements from "./pages/Achievements";
import AdminEngagement from "./pages/admin/AdminEngagement";
import PromoCodes from "./pages/PromoCodes";
import AdminPromos from "./pages/admin/AdminPromos";
import AdminCommunity from "./pages/admin/AdminCommunity";
import WatchAds from "./pages/WatchAds";
import AdminAds from "./pages/admin/AdminAds";
import AdminPayments from "./pages/admin/AdminPayments";


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: "#18181b", color: "#fff", border: "1px solid #27272a" } }} />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/verify-email" element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/referrals" element={<Referrals />} />
  <Route path="/plans" element={<Plans />} />
  <Route path="/plans/:planId/pay/:methodId" element={<Checkout />} />
  <Route path="/deposits" element={<Deposits />} /> 
  <Route path="/profile" element={<Profile />} />
  <Route path="/admin/deposits" element={<AdminDeposits />} />
  <Route path="/admin/plans" element={<AdminPlans />} />
  <Route path="/admin/members" element={<AdminMembers />} />
  <Route path="/wallet" element={<Wallet />} />
  <Route path="/transactions" element={<Transactions />} />
  <Route path="/withdrawals" element={<Withdrawals />} />
<Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
<Route path="/earnings" element={<Earnings />} />
<Route path="/achievements" element={<Achievements />} />
<Route path="/admin/achievements" element={<AdminEngagement />} />
<Route path="/promo-codes" element={<PromoCodes />} />
<Route path="/admin/promos" element={<AdminPromos />} />
<Route path="/admin/community" element={<AdminCommunity />} />
<Route path="/watch-ads" element={<WatchAds />} />
<Route path="/admin/ads" element={<AdminAds />} />
<Route path="/admin/payments" element={<AdminPayments />} />
  
  
<Route path="/my-plans" element={<MyPlans />} />
{NAV.flatMap((g) => g.items)
  .filter((i) => !["/dashboard", "/referrals", "/plans", "/deposits", "/profile", "/my-plans", "/wallet", "/transactions", "/withdrawals", "/earnings", "/achievements", "/promo-codes", "/watch-ads" ].includes(i.to))
  .map((i) => (
    <Route key={i.to} path={i.to} element={<ComingSoon title={i.label} />} />
  ))}
</Route>


          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}