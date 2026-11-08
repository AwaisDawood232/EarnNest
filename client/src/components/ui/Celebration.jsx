import { useEffect, useMemo } from "react";

const COLORS = ["#22c55e", "#4ade80", "#fbbf24", "#60a5fa", "#c084fc", "#f472b6"];

export default function Celebration({ icon, title, amount, subtitle, onClose }) {
  const pieces = useMemo(
    () => Array.from({ length: 32 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      dur: 2 + Math.random() * 1.6,
      size: 6 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
    })),
    []
  );

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <style>{`
        @keyframes confetti-fall { from { transform: translateY(-30px) rotate(0deg); opacity: 1 } to { transform: translateY(110vh) rotate(720deg); opacity: .9 } }
        @keyframes pop-in { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
      `}</style>

      {pieces.map((p, i) => (
        <span key={i} className="pointer-events-none absolute -top-4 rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color,
            animation: `confetti-fall ${p.dur}s ${p.delay}s linear infinite` }} />
      ))}

      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-brand-500/40 bg-surface p-7 text-center shadow-2xl shadow-brand-500/20"
        style={{ animation: "pop-in .45s ease-out" }}>
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-amber-500/15 text-6xl">{icon}</div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-brand-400">Congratulations</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">{title}</h2>
        {amount > 0 && (
          <p className="mt-3 font-display text-4xl font-bold text-green-400">
            +Rs {Number(amount).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
          </p>
        )}
        {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}
        <button onClick={onClose}
          className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110">
          Awesome
        </button>
      </div>
    </div>
  );
}

