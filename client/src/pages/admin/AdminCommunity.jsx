import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { MessageCircle, Loader2, ExternalLink } from "lucide-react";
import api from "../../services/api";

const input = "h-12 w-full rounded-xl border border-line bg-field px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">{label}</label>
      {children}
      <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export default function AdminCommunity() {
  const { data: me, reload } = useOutletContext();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/admin/community")
      .then((r) => setF(r.data.settings))
      .catch((e) => toast.error(e.response?.data?.message || "Could not load settings"));
  }, []);

  if (me && me.user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/admin/community", f);
      setF(data.settings);
      toast.success("Community links saved");
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
    } finally { setBusy(false); }
  };

  const testLink = f?.adminNumber ? `https://wa.me/${f.adminNumber.replace(/\D/g, "").replace(/^0/, "92")}` : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-white sm:text-4xl">
          <MessageCircle className="h-7 w-7 text-brand-400 sm:h-9 sm:w-9" /> Community Links
        </h1>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">The WhatsApp buttons shown on every member's Dashboard</p>
      </div>

      {!f ? (
        <div className="h-96 animate-pulse rounded-3xl bg-zinc-900" />
      ) : (
        <form onSubmit={save} noValidate className="space-y-5 rounded-3xl border border-line bg-surface p-4 sm:p-6">
          <Field label="Admin WhatsApp number" hint="With country code, e.g. 923001234567. A number starting with 03 is converted automatically. Leave empty to hide the button.">
            <input value={f.adminNumber} onChange={set("adminNumber")} inputMode="tel" placeholder="923001234567" className={input} />
          </Field>
          <Field label="First message (optional)" hint="Pre-filled when a member opens the chat with you.">
            <textarea value={f.adminMessage} onChange={set("adminMessage")} maxLength={200} rows={3}
              className="w-full rounded-xl border border-line bg-field p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-brand-500" />
          </Field>
          <Field label="WhatsApp Channel link" hint="In WhatsApp open your channel, tap Share, copy the link. It starts with https://whatsapp.com/channel/. Empty hides the button.">
            <input value={f.channelUrl} onChange={set("channelUrl")} inputMode="url" placeholder="https://whatsapp.com/channel/..." className={input} />
          </Field>
          <Field label="WhatsApp Group invite link" hint="Group info, then Invite via link, then Copy link. It starts with https://chat.whatsapp.com/. Empty hides the button.">
            <input value={f.groupUrl} onChange={set("groupUrl")} inputMode="url" placeholder="https://chat.whatsapp.com/..." className={input} />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row">
            {testLink && (
              <a href={testLink} target="_blank" rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line px-5 text-sm font-medium text-white hover:bg-zinc-800">
                <ExternalLink className="h-4 w-4" /> Test admin chat
              </a>
            )}
            <button disabled={busy}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:brightness-110 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Links
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

