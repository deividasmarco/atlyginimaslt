import { TAX_2026 } from '../constants/tax2026';
import {
  TaxCalculationInput, TaxCalculationResult, TaxWarning,
  VatThresholdResult, VatStatus, AnnualTaxSummary, BusinessProfile,
} from '../types/business';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * IV GPM 2026 — official VMI credit formula.
 *
 *   0 – 20 000 €      → 5%
 *   20 000 – 42 500 € → 20% minus tapering credit
 *                         credit = P × (0.15 – 2/300 000 × (P – 20 000))
 *   42 500 €+         → flat 20%  (further progressive tiers apply when
 *                         combined with other income; not in scope here)
 */
export function calculateIVGPM(taxableProfit: number): number {
  if (taxableProfit <= 0) return 0;

  if (taxableProfit <= 20_000) {
    return r2(taxableProfit * 0.05);
  }

  if (taxableProfit <= 42_500) {
    const credit = taxableProfit * (0.15 - (2 / 300_000) * (taxableProfit - 20_000));
    return r2(taxableProfit * 0.20 - Math.max(credit, 0));
  }

  // Above 42 500 € — 20% flat as preliminary estimate.
  // Full progressive brackets (25%, 32%) require cross-income context
  // from the annual GPM declaration. Caller receives HIGH_INCOME_GPM_SIMPLIFIED.
  return r2(taxableProfit * 0.20);
}

// ─────────────────────────────────────────────────────────────
// Main IV tax calculation
// ─────────────────────────────────────────────────────────────

export function calculateIVTax(input: TaxCalculationInput): TaxCalculationResult {
  const warnings: TaxWarning[] = [];

  const deductibleExpenses = input.expenseMode === 'FIXED_30_PERCENT'
    ? r2(input.income * TAX_2026.IV_EXPENSE_FLAT)
    : r2(input.actualExpenses);

  const taxableProfit = Math.max(0, r2(input.income - deductibleExpenses));

  // ── Sodra base — 90% of TAXABLE PROFIT (after deductions), not gross income
  const sodraBase    = r2(taxableProfit * TAX_2026.IV_SODRA_BASE);
  const minSodraBase = TAX_2026.IV_MIN_SODRA_BASE * 12;
  if (sodraBase < minSodraBase) warnings.push('PSD_MINIMUM_MAY_APPLY');
  if (taxableProfit > 42_500)   warnings.push('HIGH_INCOME_GPM_SIMPLIFIED');

  // VSD increases by 3 pp when pension accumulation is active
  const vsdRate = input.pensionAccumulation
    ? TAX_2026.IV_VSD + TAX_2026.PENSION_II
    : TAX_2026.IV_VSD;

  const gpm        = calculateIVGPM(taxableProfit);
  const psd        = r2(sodraBase * TAX_2026.IV_PSD);
  const vsd        = r2(sodraBase * vsdRate);
  const totalTaxes = r2(gpm + psd + vsd);

  return {
    grossIncome:        input.income,
    deductibleExpenses,
    taxableProfit,
    sodraBase,
    gpm,
    psd,
    vsd,
    totalTaxes,
    // Net = taxable profit minus all taxes
    netAfterTaxes: r2(taxableProfit - totalTaxes),
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────
// VAT threshold
// ─────────────────────────────────────────────────────────────

export function calculateVatThreshold(
  annualIncome: number,
  threshold: number = TAX_2026.PVM_THRESHOLD,
): VatThresholdResult {
  const remaining      = Math.max(0, threshold - annualIncome);
  const percentageUsed = Math.min(1, annualIncome / threshold);

  let status: VatStatus = 'SAFE';
  if (annualIncome >= threshold)   status = 'EXCEEDED';
  else if (percentageUsed >= 0.95) status = 'CRITICAL';
  else if (percentageUsed >= 0.80) status = 'WARNING';

  return { threshold, currentTurnover: annualIncome, remaining, percentageUsed, status };
}

// ─────────────────────────────────────────────────────────────
// Annual summary — side-by-side expense method comparison
// ─────────────────────────────────────────────────────────────

export function generateAnnualTaxSummary(
  income: number,
  actualExpenses: number,
  profile: Pick<BusinessProfile, 'expenseMode' | 'pensionAccumulation' | 'businessType' | 'year'>,
): AnnualTaxSummary {
  const base: Omit<TaxCalculationInput, 'expenseMode' | 'actualExpenses'> = {
    year:                profile.year,
    businessType:        profile.businessType,
    income,
    pensionAccumulation: profile.pensionAccumulation,
    monthsActive:        12,
  };

  const fixed30 = calculateIVTax({ ...base, expenseMode: 'FIXED_30_PERCENT', actualExpenses: 0 });
  const actual  = calculateIVTax({ ...base, expenseMode: 'ACTUAL_EXPENSES',   actualExpenses });

  // Consistent real-cash comparison: same actual expenses paid, different taxes.
  // Both methods subtract the same real outflows so the comparison is apples-to-apples.
  const realNetFixed30 = r2(income - actualExpenses - fixed30.totalTaxes);
  const realNetActual  = r2(income - actualExpenses - actual.totalTaxes);

  const fixed30WithRealNet: TaxCalculationResult = { ...fixed30, netAfterTaxes: realNetFixed30 };
  const actualWithRealNet:  TaxCalculationResult = { ...actual,  netAfterTaxes: realNetActual };

  const betterMethod = realNetFixed30 >= realNetActual ? 'FIXED_30_PERCENT' : 'ACTUAL_EXPENSES';
  const saving       = r2(Math.abs(realNetFixed30 - realNetActual));
  const vatThreshold = calculateVatThreshold(income);

  return {
    year:                   profile.year,
    income,
    actualExpenses,
    fixed30:                fixed30WithRealNet,
    actual:                 actualWithRealNet,
    selectedMethod:         profile.expenseMode,
    betterMethod,
    savingsByBetterMethod:  saving,
    vatThreshold,
  };
}

// ─────────────────────────────────────────────────────────────
// Projection helper
// ─────────────────────────────────────────────────────────────

export function projectAnnualIncome(
  incomeToDate: number,
  currentMonth: number = new Date().getMonth() + 1,
): number {
  if (currentMonth <= 0) return incomeToDate;
  return r2((incomeToDate / currentMonth) * 12);
}
