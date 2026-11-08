const origin = new URL(import.meta.env.VITE_API_URL, window.location.origin).origin;

export const assetUrl = (p) => (!p ? "" : /^https?:/i.test(p) ? p : origin + p);