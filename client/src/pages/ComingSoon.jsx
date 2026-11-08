import { Construction } from "lucide-react";

export default function ComingSoon({ title }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
          <Construction className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-zinc-400">This page is coming soon.</p>
      </div>
    </div>
  );
}