import {
  getTaxConfig,
  calculateIvGpm,
  gpMHighIncomeThreshold,
} from '../../../constants/taxRates';
import {
  CreditIncomeInput,
  CreditIncomePeriodInput,
  CreditIncomePeriodResult,
  CreditIncomeResult,
  CreditWarning,
  PensionAccumulation,
} from '../types/creditIncome.types';

function r2(n: number): number { return Math.round(n * 100) / 100; }

function getVsdRate(pension: PensionAccumulation, base: number): number {
  switch (pension) {
    case 'PENSION_3': return base + 0.03;
    case 'UNKNOWN':   return base + 0.03;   // conservative
    default:          return base;
  }
}

const CY = new Date().getFullYear();
const PY = CY - 1;

// ─────────────────────────────────────────────────────────────
// Core period calculation
// ─────────────────────────────────────────────────────────────

function calculatePeriod(
  period: CreditIncomePeriodInput,
  input: CreditIncomeInput,
  periodYear: number,
): CreditIncomePeriodResult {
  const warnings: CreditWarning[] = [];
  const cfg = getTaxConfig(periodYear);

  // Expenses
  const expensesUsed = input.expenseMode === 'FIXED_30_PERCENT'
    ? r2(period.income * cfg.flatExpenseRate)
    : r2(period.expenses);

  const taxableProfit = r2(Math.max(0, period.income - expensesUsed));

  // #1 — Sodra cap: absolute annual cap, pro-rated to period
  const periodSodraCap = r2(cfg.sodraCapAnnual * (period.months / 12));
  const rawSodraBase   = r2(taxableProfit * cfg.sodraBaseRate);
  const sodraBase      = r2(Math.min(rawSodraBase, periodSodraCap));

  if (rawSodraBase > periodSodraCap) warnings.push('SODRA_CAP_APPLIED');

  // VSD
  const vsdRate = getVsdRate(input.pensionAccumulation, cfg.vsdRate);
  const vsd     = r2(sodraBase * vsdRate);

  // PSD with minimum enforcement
  const psdFromIncome = r2(sodraBase * cfg.psdRate);
  const minimumPsd    = r2(cfg.mma * cfg.psdRate * period.months);

  let psd: number;
  if (input.psdInsuredElsewhere) {
    psd = psdFromIncome;
    warnings.push('PSD_INSURED_ELSEWHERE');
  } else {
    psd = r2(Math.max(psdFromIncome, minimumPsd));
    if (psd > psdFromIncome) warnings.push('PSD_MINIMUM_APPLIED');
  }

  // #2 — GPM: annualize → calculate annual GPM → pro-rate back
  const annualizedTaxableProfit = r2(taxableProfit / period.months * 12);
  const annualGpm               = calculateIvGpm(annualizedTaxableProfit, periodYear);
  const gpm                     = r2(annualGpm / 12 * period.months);

  // #3 — warning when above the year's simplified-GPM threshold
  if (annualizedTaxableProfit > gpMHighIncomeThreshold(periodYear)) {
    warnings.push('HIGH_INCOME_GPM_SIMPLIFIED');
  }

  // Totals
  const totalTaxes    = r2(gpm + psd + vsd);
  const netIncome     = r2(taxableProfit - totalTaxes);
  const avgMonthlyNet = r2(netIncome / period.months);

  return {
    months: period.months,
    income: period.income,
    expensesUsed,
    taxableProfit,
    sodraBase,
    gpm,
    psd,
    vsd,
    totalTaxes,
    netIncome,
    avgMonthlyNet,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────

export function calculateCreditIncome(input: CreditIncomeInput): CreditIncomeResult {
  const previousYear = calculatePeriod(input.previousYear, input, PY);
  const recentPeriod = calculatePeriod(input.recentPeriod,  input, CY);

  const creditworthyMonthlyIncome = r2(Math.min(
    previousYear.avgMonthlyNet,
    recentPeriod.avgMonthlyNet,
  ));

  const selectedReason: CreditIncomeResult['selectedReason'] =
    previousYear.avgMonthlyNet <= recentPeriod.avgMonthlyNet
      ? 'PREVIOUS_YEAR_LOWER'
      : 'RECENT_PERIOD_LOWER';

  const allWarnings = [...new Set([
    ...previousYear.warnings,
    ...recentPeriod.warnings,
  ])] as CreditWarning[];

  return { previousYear, recentPeriod, creditworthyMonthlyIncome, selectedReason, warnings: allWarnings };
}
