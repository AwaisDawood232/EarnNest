import { useCallback, useEffect, useState } from "react";
import { Layers, Check, CalendarDays, TrendingUp, Zap } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { money } from "../utils/format";
import PaymentMethodModal from "../components/PaymentMethodModal";

function PlanCard({ plan, onBuy }) {
  return (
    <div className={`relative flex flex-col rounded-3xl border p-5 sm:p-6 ${
      plan.popular ? "border-brand-500/60 bg-gradient-to-b from-green-950/50 to-surface shadow-lg shadow-brand-500/10" : "border-line bg-field"
    }`}>
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-semibold text-white">Popular</span>
      )}
      <h3 className="font-display text-lg font-bold text-white sm:text-xl">{plan.name}</h3>
      <p className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">{money(plan.price)}</p>

      <ul className="mt-5 flex-1 space-y-3 text-sm text-zinc-300">
        <li className="flex items-center gap-3"><Check className="h-4 w-4 text-brand-400" /> {money(plan.dailyProfit)} daily profit</li>
        <li className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-brand-400" /> {plan.durationDays} days validity</li>
        <li className="flex items-center gap-3 text-brand-400"><TrendingUp className="h-4 w-4" /> Total Earning: {money(plan.totalProfit)}</li>
        <li className="flex items-center gap-3 text-brand-400"><Zap className="h-4 w-4" /> ROI: {plan.roi.toFixed(1)}%</li>
      </ul>

      <button onClick={() => onBuy(plan)}
        className={`mt-6 h-12 w-full rounded-xl text-sm font-semibold transition ${
          plan.popular
            ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25 hover:brightness-110"
            : "border border-line bg-zinc-800 text-white hover:bg-zinc-700"
        }`}>
        Purchase Plan
      </button>
    </div>
  );
}

export default function Plans() {
  const [plans, setPlans] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState(null);
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    Promise.all([api.get("/plans"), api.get("/plans/methods")])
      .then(([p, m]) => { setPlans(p.data.plans); setMethods(m.data.methods); })
      .catch((e) => toast.error(e.response?.data?.message || "Could not load plans"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-4xl">Investment Plans</h1>
        <p className="mt-1 text-sm text-zinc-400 ">Choose a plan to start earning</p>
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white sm:text-xl">
          <Layers className="h-5 w-5 text-brand-400" /> Available Plans
        </h2>
        {!plans ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-zinc-900" />)}
          </div>
        ) : (
          <div className="grid gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => <PlanCard key={p.id} plan={p} onBuy={setSelected} />)}
          </div>
        )}
      </section>

      {selected && <PaymentMethodModal plan={selected} methods={methods} onClose={close} />}
    </div>
  );
}

