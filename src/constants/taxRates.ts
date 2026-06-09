/**
 * Year-specific Lithuanian IV tax constants.
 * Always use getTaxConfig(year) — never hard-code TAX_CONFIG_2026 in new code.
 */

export interface TaxConfig {
  year: number;
  mma: number;              // Minimum monthly wage (MMA)
  vdu: number;              // Average monthly wage (VDU)
  psdRate: number;          // PSD rate 6.98%
  vsdRate: number;          // VSD base rate 12.52%
  pensionRate: number;      // II-pillar pension add-on 3%
  sodraCapAnnual: number;   // Absolute annual Sodra ceiling (€)
  sodraBaseRate: number;    // 90% — Sodra on 90% of taxable profit
  flatExpenseRate: number;  // 30% fixed expense deduction
  vatThreshold: number;     // PVM registration threshold
}

// #1 — Sodra caps as absolute annual values (not multipliers)
export const TAX_CONFIG_2025: TaxConfig = {
  year:            2025,
  mma:             1038,
  vdu:             2109.81,
  psdRate:         0.0698,
  vsdRate:         0.1252,
  pensionRate:     0.03,
  sodraCapAnnual:  90_681.84,   // 43 × VDU_2025
  sodraBaseRate:   0.90,
  flatExpenseRate: 0.30,
  vatThreshold:    45_000,
};

export const TAX_CONFIG_2026: TaxConfig = {
  year:            2026,
  mma:             1153,
  vdu:             2312.15,
  psdRate:         0.0698,
  vsdRate:         0.1252,
  pensionRate:     0.03,
  sodraCapAnnual:  99_422.45,   // 43 × VDU_2026
  sodraBaseRate:   0.90,
  flatExpenseRate: 0.30,
  vatThreshold:    45_000,
};

export function getTaxConfig(year: number): TaxConfig {
  if (year <= 2025) return TAX_CONFIG_2025;
  return TAX_CONFIG_2026;
}

// ─────────────────────────────────────────────────────────────
// Year-specific IV GPM formulas
// ─────────────────────────────────────────────────────────────

function r2(n: number): number { return Math.round(n * 100) / 100; }

/**
 * #2 — 2025 IV GPM: linear interpolation 5% → 15% between 20k–35k.
 *   0 – 20 000 €      → 5%
 *   20 000 – 35 000 € → linear 5% → 15%
 *   35 000 €+         → 15%
 */
export function calculateIvGpm2025(p: number): number {
  if (p <= 0) return 0;
  if (p <= 20_000) return r2(p * 0.05);
  if (p <= 35_000) {
    const progress = (p - 20_000) / 15_000;
    const rate     = 0.05 + progress * 0.10;
    return r2(p * rate);
  }
  return r2(p * 0.15);
}

/**
 * 2026 IV GPM: VMI credit formula (effective 5% → 20%).
 *   0 – 20 000 €      →  5%
 *   20 000 – 42 500 € → 20% minus tapering credit
 *   42 500 €+         → 20% flat (preliminary — higher brackets may apply)
 */
export function calculateIvGpm2026(p: number): number {
  if (p <= 0) return 0;
  if (p <= 20_000) return r2(p * 0.05);
  if (p <= 42_500) {
    const credit = p * (0.15 - (2 / 300_000) * (p - 20_000));
    return r2(p * 0.20 - Math.max(credit, 0));
  }
  return r2(p * 0.20);
}

/** Route to correct formula by year. */
export function calculateIvGpm(taxableProfit: number, year: number): number {
  if (year <= 2025) return calculateIvGpm2025(taxableProfit);
  return calculateIvGpm2026(taxableProfit);
}

/** #3 — Preliminary GPM threshold by year. */
export function gpMHighIncomeThreshold(year: number): number {
  return year <= 2025 ? 35_000 : 42_500;
}
