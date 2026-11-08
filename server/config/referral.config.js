export const MAX_LEVELS = 10; // how deep the upline chain is stored

// Direct referrer's rate on a referral's FIRST plan, by how many
// active referrals (direct referrals who bought a plan) they already have.
export const DIRECT_TIERS = [
  { min: 0,  rate: 10 },
  { min: 11, rate: 12 },
  { min: 18, rate: 15 },
];

// Direct referrer's rate when that referral buys another plan
export const REPURCHASE_DIRECT = 5;

// Level 2, Level 3 ... (percent of the plan price, first purchase only)
export const INDIRECT_RATES = [2, 1];

// One-time bonus for a referred member's first approved plan (Rs)
export const WELCOME_BONUS = 50;

export const rateForCount = (count) =>
  [...DIRECT_TIERS].reverse().find((t) => count >= t.min)?.rate ?? DIRECT_TIERS[0].rate;

