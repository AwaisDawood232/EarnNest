const KEY = "referralCode";
const VALID = /^[A-Z0-9]{4,12}$/;

export const saveRefFromUrl = () => {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (ref && VALID.test(ref)) localStorage.setItem(KEY, ref);
  } catch {}
};
export const getStoredRef = () => {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
};
export const clearStoredRef = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
