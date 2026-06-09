import { TAX_2026 } from '../constants/tax2026';
import { TaxEstimate, IVOptions } from '../types';

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcIV(opts: IVOptions): TaxEstimate {
  const { annualIncome, useFlat30, actualExpenses } = opts;

  const deductible = useFlat30
    ? annualIncome * TAX_2026.IV_EXPENSE_FLAT
    : actualExpenses;

  const taxableProfit = Math.max(0, annualIncome - deductible);

  // Progressive GPM: 5% up to €20k, 15% above
  let gpm = 0;
  if (taxableProfit <= TAX_2026.IV_GPM_THRESHOLD) {
    gpm = taxableProfit * TAX_2026.IV_GPM_LOW;
  } else {
    gpm = TAX_2026.IV_GPM_THRESHOLD * TAX_2026.IV_GPM_LOW
      + (taxableProfit - TAX_2026.IV_GPM_THRESHOLD) * TAX_2026.IV_GPM_HIGH;
  }

  // Sodra from 90% of income (not less than 12 × MMA)
  const sodraBase = Math.max(
    TAX_2026.IV_MIN_SODRA_BASE * 12,
    annualIncome * TAX_2026.IV_SODRA_BASE
  );
  const sodraVSD = r2(sodraBase * TAX_2026.IV_VSD);
  const sodraPSD = r2(sodraBase * TAX_2026.IV_PSD);
  const totalTax = r2(gpm + sodraVSD + sodraPSD);
  const netIncome = r2(annualIncome - totalTax - (useFlat30 ? 0 : actualExpenses));

  return {
    grossIncome: annualIncome,
    deductibleExpenses: r2(deductible),
    taxableProfit: r2(taxableProfit),
    gpm: r2(gpm),
    sodraVSD,
    sodraPSD,
    totalTax,
    netIncome,
    effectiveRate: r2((totalTax / annualIncome) * 100),
  };
}

// Compare flat 30% deduction vs actual expenses
export function compareDeductions(annualIncome: number, actualExpenses: number) {
  const flat   = calcIV({ annualIncome, useFlat30: true,  actualExpenses: 0 });
  const actual = calcIV({ annualIncome, useFlat30: false, actualExpenses });
  return {
    flat,
    actual,
    betterOption: flat.netIncome >= actual.netIncome ? 'flat' : 'actual' as 'flat' | 'actual',
    difference: r2(Math.abs(flat.netIncome - actual.netIncome)),
  };
}

// PVM warning threshold check
export function checkPVMWarning(yearToDateIncome: number): {
  isNearLimit: boolean;
  isOverLimit: boolean;
  remaining: number;
  percent: number;
} {
  const remaining = TAX_2026.IV_INCOME_LIMIT - yearToDateIncome;
  const percent   = Math.min(100, (yearToDateIncome / TAX_2026.IV_INCOME_LIMIT) * 100);
  return {
    isNearLimit: yearToDateIncome >= TAX_2026.IV_INCOME_LIMIT * 0.85,
    isOverLimit: yearToDateIncome >= TAX_2026.IV_INCOME_LIMIT,
    remaining:   Math.max(0, r2(remaining)),
    percent:     Math.round(percent),
  };
}
