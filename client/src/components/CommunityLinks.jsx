const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const ITEMS = [
  { key: "admin",   label: "WhatsApp Admin",   sub: "Chat directly",  cls: "from-green-600 to-green-500 shadow-green-500/25" },
  { key: "channel", label: "WhatsApp Channel", sub: "News & updates", cls: "from-green-600 to-green-500 shadow-green-500/25" },
  { key: "group",   label: "WhatsApp Group",   sub: "Join members",   cls: "from-purple-600 to-violet-500 shadow-purple-500/25" },
];

export default function CommunityLinks({ community, title = "Join our community", text = "Get support, news and tips on WhatsApp." }) {
  const items = ITEMS.filter((i) => community?.[i.key]);
  if (!items.length) return null;

  return (
    <section className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-white sm:text-xl">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{text}</p>

      <div className="mt-5 grid gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((i) => (
          <a key={i.key} href={community[i.key]} target="_blank" rel="noopener noreferrer"
            className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-field p-3 text-center transition hover:border-brand-500/40 hover:bg-zinc-900 sm:gap-3 sm:p-5">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition group-hover:scale-105 sm:h-16 sm:w-16 ${i.cls}`}>
              <WhatsAppIcon className="h-7 w-7 sm:h-9 sm:w-9" />
            </span>
            <span className="text-xs font-semibold leading-tight text-white sm:text-sm">{i.label}</span>
            <span className="hidden text-xs text-zinc-500 sm:block">{i.sub}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

