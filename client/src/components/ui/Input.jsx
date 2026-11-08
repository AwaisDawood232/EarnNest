import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const Input = forwardRef(({ label, icon: Icon, error, type = "text", ...props }, ref) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium text-zinc-300">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />}
        <input
          ref={ref}
          type={isPassword && show ? "text" : type}
          className={`h-12 w-full rounded-xl border bg-field text-sm text-white placeholder:text-zinc-500
            outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
            ${Icon ? "pl-11" : "pl-4"} ${isPassword ? "pr-11" : "pr-4"}
            ${error ? "border-red-500" : "border-line"}`}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
});

export default Input;