/**
 * Derived markets probabilities (Over/Under 2.5, BTTS, Double Chance).
 * Pure functions: input stats + weights -> output probabilities.
 */

export function doubleChance(p1, px, p2) {
  return {
    p1x: clamp(p1 + px, 0, 1),
    px2: clamp(px + p2, 0, 1),
    p12: clamp(p1 + p2, 0, 1),
  };
}

/**
 * h/a example shape:
 * { atk: number, def: number }
 */
export function probOver25FromStats(h, a, weights = {}) {
  const { WEIGHT_ATTACK = 1.0, WEIGHT_DEFENSE = 1.0 } = weights;

  const avgGoals =
    ((h.atk * WEIGHT_ATTACK) + (a.atk * WEIGHT_ATTACK) + (h.def * WEIGHT_DEFENSE) + (a.def * WEIGHT_DEFENSE)) / 2;

  // Heuristic mapping -> probability
  const p = 0.50 + (avgGoals - 2.5) * 0.18;
  return clamp(p, 0.30, 0.85);
}

export function probBTTSFromStats(h, a, weights = {}) {
  const { WEIGHT_ATTACK = 1.0, WEIGHT_DEFENSE = 1.0 } = weights;

  const attCombo = ((h.atk - 1.0) + (a.atk - 1.0)) * WEIGHT_ATTACK;
  const defWeak  = ((h.def - 1.2) + (a.def - 1.2)) * WEIGHT_DEFENSE;

  const p = 0.50 + attCombo * 0.15 + defWeak * 0.10;
  return clamp(p, 0.25, 0.80);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
