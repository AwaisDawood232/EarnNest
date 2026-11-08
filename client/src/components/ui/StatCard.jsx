const TONES = {
  blue:   { box: "bg-blue-500/10 text-blue-400",     glow: "bg-blue-500/15" },
  green:  { box: "bg-green-500/10 text-green-400",   glow: "bg-green-500/15" },
  purple: { box: "bg-purple-500/10 text-purple-400", glow: "bg-purple-500/15" },
  amber:  { box: "bg-amber-500/10 text-amber-400",   glow: "bg-amber-500/15" },
};

export default function StatCard({ icon: Icon, label, value, tone = "green", layout = "stack" }) {
  const t = TONES[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${t.glow}`} />
      <div className={`relative ${layout === "row" ? "flex items-center gap-3 sm:gap-4" : "space-y-3 sm:space-y-4"}`}>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-12 sm:w-12 ${t.box}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-zinc-400 sm:text-sm">{label}</p>
          <p className="truncate font-display text-lg font-bold text-white sm:text-2xl">{value}</p>
        </div>
      </div>
    </div>
  );
}