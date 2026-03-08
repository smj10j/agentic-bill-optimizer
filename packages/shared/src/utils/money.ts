/**
 * Format cents as a display dollar string.
 * Examples: 4250 → "$42.50", -4250 → "-$42.50"
 */
export function formatCents(cents: number, options?: { showSign?: boolean }): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  const formatted = `$${Number(dollars).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  if (negative) return `-${formatted}`;
  if (options?.showSign && cents > 0) return `+${formatted}`;
  return formatted;
}

/**
 * Format basis points as an APY string.
 * Example: 450 → "4.50%"
 */
export function formatApyBasisPoints(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}

/**
 * Calculate monthly yield earnings for a balance and APY.
 */
export function monthlyYieldCents(balanceCents: number, apyBasisPoints: number): number {
  const apy = apyBasisPoints / 10000;
  return Math.floor((balanceCents * apy) / 12);
}
