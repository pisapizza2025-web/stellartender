/**
 * Fee and savings maths. Every figure shown to a merchant from here is an
 * estimate and is labelled as one in the UI.
 */

export const BPS_DENOMINATOR = 10_000;

/**
 * Demo default platform fee: 75 bps = 0.75%. On £100 the merchant receives
 * £99.25 and Stellar Flexi Payment receives £0.75. This is only the default —
 * the live rate is read from platform_settings and is editable in Settings.
 */
export const DEFAULT_PLATFORM_FEE_BPS = 75;

export function feeFromBps(amount: number, bps: number): number {
  return Math.round(((amount * bps) / BPS_DENOMINATOR) * 1e7) / 1e7;
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/** Stellar Flexi Payment effective rate = platform fee + configured settlement cost. */
export function effectiveRatePct(platformFeeBps: number, settlementCostPct: number): number {
  return bpsToPercent(platformFeeBps) + settlementCostPct;
}

export type SavingsEstimate = {
  volume: number;
  cardFees: number;
  altFees: number;
  savings: number;
  cardRatePct: number;
  altRatePct: number;
};

export function estimateSavings(
  volume: number,
  cardRatePct: number,
  platformFeeBps: number,
  settlementCostPct: number,
): SavingsEstimate {
  const altRatePct = effectiveRatePct(platformFeeBps, settlementCostPct);
  const cardFees = (volume * cardRatePct) / 100;
  const altFees = (volume * altRatePct) / 100;
  return {
    volume,
    cardFees,
    altFees,
    savings: cardFees - altFees,
    cardRatePct,
    altRatePct,
  };
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}
