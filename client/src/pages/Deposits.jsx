import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { money } from "../utils/format";

const STATUS = {
  pending:  ["Pending verification", "bg-amber-500/10 text-amber-400"],
  approved: ["Approved", "bg-green-500/10 text-green-400"],
  rejected: ["Rejected", "bg-red-500/10 text-red-400"],
};

export default function Deposits() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get("/deposits")
      .then((r) => setRows(r.data.deposits))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load deposits"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Deposits</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Track your payment submissions</p>
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        {!rows ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-900" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-zinc-500"><ArrowDownToLine className="h-7 w-7" /></div>
            <p className="font-display text-lg font-semibold text-white">No deposits yet</p>
            <p className="text-sm text-zinc-400">Purchase a plan to make your first deposit</p>
            <Link to="/plans" className="mt-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Browse Plans</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((d) => {
              const [label, cls] = STATUS[d.status] || STATUS.pending;
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-field p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{d.planName} · {money(d.amount)}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {d.methodName} · {d.transactionId} · {d.createdAt && new Date(d.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    {d.status === "rejected" && d.reason && <p className="mt-1 text-xs text-red-400">{d.reason}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
