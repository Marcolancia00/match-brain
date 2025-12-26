/**
 * Poisson-based 1X2 probability model.
 * Intended to be used inside Google Apps Script (JavaScript runtime).
 *
 * Notes:
 * - We keep the model deterministic and lightweight (no ML libs).
 * - Weights are passed in to allow auto-calibration.
 */

export function calculate1X2Probabilities(homeAtk, homeDef, awayAtk, awayDef, weights) {
  const {
    WEIGHT_ATTACK = 1.0,
    WEIGHT_DEFENSE = 1.0
  } = weights || {};

  const lambdaHome = ((homeAtk * WEIGHT_ATTACK) + (awayDef * WEIGHT_DEFENSE)) / 2;
  const lambdaAway = ((awayAtk * WEIGHT_ATTACK) + (homeDef * WEIGHT_DEFENSE)) / 2;

  const MAX_GOALS = 6;

  let p1 = 0, px = 0, p2 = 0;

  for (let i = 0; i <= MAX_GOALS; i++) {
    const pHome = poisson(lambdaHome, i);
    for (let j = 0; j <= MAX_GOALS; j++) {
      const pAway = poisson(lambdaAway, j);
      const p = pHome * pAway;

      if (i > j) p1 += p;
      else if (i === j) px += p;
      else p2 += p;
    }
  }

  // Normalize (numerical safety)
  const s = p1 + px + p2;
  if (s > 0) {
    p1 /= s; px /= s; p2 /= s;
  }

  return {
    p1: round3(p1),
    px: round3(px),
    p2: round3(p2),
    lambdaHome,
    lambdaAway
  };
}

export function poisson(lambda, k) {
  return Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k);
}

export function factorial(n) {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function round3(v) {
  return Math.round(Number(v) * 1000) / 1000;
}
