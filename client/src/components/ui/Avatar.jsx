import { useEffect, useState } from "react";
import { assetUrl } from "../../utils/assets";

const initialsOf = (name = "") =>
  name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "U";

export default function Avatar({ src, name, className = "h-10 w-10 text-sm" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const url = assetUrl(src);

  return (
    <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-500 font-bold text-white ${className}`}>
      {url && !failed ? (
        <img src={url} alt={name || "Profile"} referrerPolicy="no-referrer"
          onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}
