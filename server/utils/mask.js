export const maskAccount = (n = "") => (n.length > 7 ? `${n.slice(0, 4)}****${n.slice(-3)}` : "");



