import { useEffect, useState } from "react";
import { assetUrl } from "../../utils/assets";

export default function MethodLogo({ method, size = "h-20 w-20" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [method.logo]);
  const src = method.logo?.startsWith("/uploads") ? assetUrl(method.logo) : method.logo;

  return (
    <div className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-2xl bg-white`}>
      {!src || failed ? (
        <span className="font-display text-2xl font-bold text-zinc-800">{(method.name || "?")[0].toUpperCase()}</span>
      ) : (
        <img src={src} alt={method.name} onError={() => setFailed(true)} className="h-full w-full object-contain p-2" />
      )}
    </div>
  );
}

