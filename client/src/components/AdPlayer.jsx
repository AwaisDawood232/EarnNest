import { useCallback, useEffect, useRef, useState } from "react";
import { X, Play, Pause, Loader2, EyeOff, ExternalLink, Check } from "lucide-react";
import api from "../services/api";
import { assetUrl } from "../utils/assets";
import { money } from "../utils/format";

let ytPromise = null;
const loadYT = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => { ytPromise = null; reject(new Error("blocked")); };
      document.head.appendChild(s);
    });
  }
  return ytPromise;
};

const LOAD_ERROR = { msg: "The video could not be loaded. Check your connection or turn off your ad blocker, then try again.", retry: false };

function VideoAd({ session, onClose, onDone }) {
  const { viewId, ad } = session;
  const need = ad.requiredSec;

  const [watched, setWatched] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(ad.type !== "youtube");
  const [away, setAway] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const w = useRef(0);
  const isPlaying = useRef(false);
  const finished = useRef(false);
  const video = useRef(null);
  const yt = useRef(null);
  const box = useRef(null);

  const setPlay = (v) => { isPlaying.current = v; setPlaying(v); };

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setSaving(true);
    setError(null);
    try { video.current?.pause(); yt.current?.pauseVideo?.(); } catch {}
    try {
      const { data } = await api.post(`/ads/views/${viewId}/complete`, { watchedSec: w.current });
      onDone(data);
    } catch (e) {
      finished.current = false;
      setSaving(false);
      setError({ msg: e.response?.data?.message || "Could not confirm your watch time.", retry: true });
    }
  }, [viewId, onDone]);

  // counts only while the video is really playing and the tab is visible
  useEffect(() => {
    const t = setInterval(() => {
      if (!isPlaying.current || document.hidden || finished.current) return;
      w.current = Math.min(w.current + 0.25, need);
      setWatched(w.current);
      if (w.current >= need) finish();
    }, 250);
    return () => clearInterval(t);
  }, [need, finish]);

  // pause when the member leaves the tab
  useEffect(() => {
    const h = () => {
      if (!document.hidden) return;
      try { video.current?.pause(); yt.current?.pauseVideo?.(); } catch {}
      setAway(true);
    };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // YouTube player
  useEffect(() => {
    if (ad.type !== "youtube") return;
    let dead = false, ok = false;
    const timer = setTimeout(() => { if (!dead && !ok) setError(LOAD_ERROR); }, 12000);

    loadYT()
      .then((YT) => {
        if (dead || !box.current) return;
        const holder = document.createElement("div");
        box.current.appendChild(holder);
        yt.current = new YT.Player(holder, {
          videoId: ad.videoId, width: "100%", height: "100%",
          playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3 },
          events: {
            onReady: () => { ok = true; setReady(true); try { yt.current.playVideo(); } catch {} },
            onStateChange: (e) => setPlay(e.data === 1),
            onError: () => setError({ msg: "This video cannot be played. Please try another ad.", retry: false }),
          },
        });
      })
      .catch(() => !dead && setError(LOAD_ERROR));

    return () => {
      dead = true;
      clearTimeout(timer);
      try { yt.current?.destroy(); } catch {}
      yt.current = null;
    };
  }, [ad]);

  const toggle = () => {
    setAway(false);
    if (ad.type === "youtube") {
      const p = yt.current;
      if (!p) return;
      isPlaying.current ? p.pauseVideo() : p.playVideo();
    } else {
      const v = video.current;
      if (!v) return;
      v.paused ? v.play().catch(() => {}) : v.pause();
    }
  };

  const close = () => {
    if (saving) return;
    if (w.current > 0 && !window.confirm("Leave now? Your progress for this ad will be lost.")) return;
    onClose();
  };

  const pct = Math.min((watched / need) * 100, 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/90 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-t-3xl border border-line bg-surface sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-white sm:text-lg">{ad.title}</p>
            <p className="text-xs text-zinc-400">Reward {money(ad.reward)}</p>
          </div>
          <button onClick={close} disabled={saving} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          {ad.type === "youtube" ? (
            <div ref={box} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
          ) : (
            <video ref={video} src={assetUrl(ad.src)} autoPlay loop playsInline preload="auto" disablePictureInPicture
              controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()}
              onPlaying={() => setPlay(true)} onPause={() => setPlay(false)} onWaiting={() => setPlay(false)}
              onError={() => setError(LOAD_ERROR)} className="absolute inset-0 h-full w-full object-contain" />
          )}

          {/* our own play and pause layer (no seeking) */}
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} disabled={!ready || saving}
            className="absolute inset-0 grid place-items-center">
            {!ready ? <Loader2 className="h-10 w-10 animate-spin text-white" />
              : !playing && !saving ? <span className="grid h-16 w-16 place-items-center rounded-full bg-black/60 text-white"><Play className="h-8 w-8" /></span>
              : null}
          </button>
          {playing && (
            <button onClick={toggle} aria-label="Pause"
              className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white opacity-0 transition hover:opacity-100 focus:opacity-100">
              <Pause className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-zinc-400">Watched <span className="font-semibold text-white">{Math.floor(watched)}s</span> of {need}s</span>
              <span className="font-semibold text-white">{Math.floor(pct)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-200" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {saving && <p className="flex items-center gap-2 text-sm text-brand-400"><Loader2 className="h-4 w-4 animate-spin" /> Adding your reward…</p>}

          {away && !error && !saving && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0" /> The ad paused because you left this tab. Tap the video to continue.
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <p>{error.msg}</p>
              <div className="mt-3 flex gap-2">
                {error.retry && <button onClick={finish} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Try again</button>}
                <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-white hover:bg-zinc-800">Close</button>
              </div>
            </div>
          )}

          {!error && !saving && (
            <p className="text-xs text-zinc-500">Keep this tab open and the video playing. The timer stops when the video is paused.</p>
          )}
        </div>
      </div>
    </div>
  );
}









function LinkAd({ session, onClose, onDone }) {
  const { viewId, ad } = session;
  const need = ad.requiredSec;
  const [openedAt, setOpenedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!openedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [openedAt]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const elapsed = openedAt ? Math.min((now - openedAt) / 1000, need) : 0;
  const ready = !!openedAt && elapsed >= need;
  const pct = (elapsed / need) * 100;

  const open = () => {
    const w = window.open(ad.src, "_blank");
    if (!w) { setError("Your browser blocked the new tab. Allow pop-ups for this site and tap Open ad again."); return; }
    try { w.opener = null; } catch {}
    setError("");
    if (!openedAt) { setOpenedAt(Date.now()); setNow(Date.now()); }
  };

  const claim = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/ads/views/${viewId}/complete`, { watchedSec: need });
      onDone(data);
    } catch (e) {
      setSaving(false);
      setError(e.response?.data?.message || "Could not confirm your visit. Please try again.");
    }
  };

  const close = () => {
    if (saving) return;
    if (openedAt && !window.confirm("Leave now? You will not get the reward for this ad.")) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/90 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-line bg-surface sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-white sm:text-lg">{ad.title}</p>
            <p className="text-xs text-zinc-400">Reward {money(ad.reward)}</p>
          </div>
          <button onClick={close} disabled={saving} aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-zinc-300 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-5">
          <ol className="space-y-2 text-sm text-zinc-300">
            <li className="flex gap-2"><span className="font-bold text-brand-400">1.</span> Tap <b>Open ad</b>. The ad opens in a new tab.</li>
            <li className="flex gap-2"><span className="font-bold text-brand-400">2.</span> Stay on the ad for {need} seconds.</li>
            <li className="flex gap-2"><span className="font-bold text-brand-400">3.</span> Come back here and tap <b>Claim reward</b>.</li>
          </ol>

          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-zinc-400">{openedAt ? <>Time on ad <span className="font-semibold text-white">{Math.floor(elapsed)}s</span> of {need}s</> : `Required time: ${need}s`}</span>
              <span className="font-semibold text-white">{Math.floor(pct)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={open} disabled={saving}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60">
              <ExternalLink className="h-4 w-4" /> {openedAt ? "Open ad again" : "Open ad"}
            </button>
            <button onClick={claim} disabled={!ready || saving}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-bold text-white shadow-lg shadow-brand-500/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Adding reward…" : ready ? "Claim reward" : "Claim reward"}
            </button>
          </div>
          <p className="text-xs text-zinc-500">Keep the ad tab open until the timer finishes, then return to this tab.</p>
        </div>
      </div>
    </div>
  );
}

export default function AdPlayer(props) {
  return props.session.ad.type === "link" ? <LinkAd {...props} /> : <VideoAd {...props} />;
}