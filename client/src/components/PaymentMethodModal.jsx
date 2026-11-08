import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Wallet } from "lucide-react";
import MethodLogo from "./ui/MethodLogo";
import { money } from "../utils/format";

export default function PaymentMethodModal({ plan, methods, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Choose payment method</p>
            <h2 className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">Investment Gateway</h2>
            <p className="mt-1 text-sm text-zinc-400">{plan.name} · {money(plan.price)}</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {methods.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">No payment methods are available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {methods.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-field p-4">
                <MethodLogo method={m} />
                <p className="text-sm font-bold uppercase tracking-wide text-white">{m.name}</p>
                <button onClick={() => navigate(`/plans/${plan.id}/pay/${m.id}`)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 hover:brightness-110">
                  <Wallet className="h-4 w-4" /> Deposit
                </button>
                
              </div>
              
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

