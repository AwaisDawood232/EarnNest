import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNav from "./BottomNav";
import api from "../../services/api";

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState({ deposits: 0, withdrawals: 0 });
  const lastTotal = useRef(null);
  const { pathname } = useLocation();

  const load = useCallback(async () => {
    try {
      let res;
      try {
        res = await api.get("/dashboard");
      } catch (e) {
        if (e.response?.status !== 404) throw e;
        await api.post("/auth/sync", {});
        res = await api.get("/dashboard");
      }
      setData(res.data);
    } catch (e) {
      console.error("DASHBOARD ERROR:", e);
      toast.error(e.response?.data?.message || "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const isAdmin = data?.user?.role === "admin";

  const loadNotif = useCallback(async () => {
    try {
      const { data: n } = await api.get("/admin/notifications");
      const total = n.deposits + n.withdrawals;
      if (lastTotal.current !== null && total > lastTotal.current) {
        toast("New request waiting for review", { icon: "🔔" });
      }
      lastTotal.current = total;
      setNotif(n);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!isAdmin) return;
    loadNotif();
    const t = setInterval(loadNotif, 30000);
    return () => clearInterval(t);
  }, [isAdmin, loadNotif]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="min-h-dvh bg-base">
      <Sidebar open={open} onClose={() => setOpen(false)} isAdmin={isAdmin} notif={notif} />
      <div className="lg:pl-72">
        <Topbar onMenu={() => setOpen(true)} balance={data?.totalBalance} avatar={data?.user?.avatarUrl} isAdmin={isAdmin} notif={notif} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={{ data, loading, reload: load, refreshNotif: loadNotif }} />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

