import { calculateIVTax } from '../engine/taxEngine';
import { TAX_2026 } from '../constants/tax2026';

export interface ForecastTaxes {
  gpm: number;
  psd: number;
  vsd: number;
  totalTax: number;
  belowMinSodra: boolean;
  highIncomeSimplified: boolean;
  minSodraBase: number;
}

export function calcForecastTaxes(income: number, pensionAccumulation = false): ForecastTaxes | null {
  if (income <= 0) return null;

  const result = calculateIVTax({
    year:                new Date().getFullYear(),
    businessType:        'INDIVIDUALI_VEIKLA',
    income,
    actualExpenses:      0,
    expenseMode:         'FIXED_30_PERCENT',
    pensionAccumulation,
    monthsActive:        12,
  });

  return {
    gpm:                  result.gpm,
    psd:                  result.psd,
    vsd:                  result.vsd,
    totalTax:             result.totalTaxes,
    belowMinSodra:        result.warnings.includes('PSD_MINIMUM_MAY_APPLY'),
    highIncomeSimplified: result.warnings.includes('HIGH_INCOME_GPM_SIMPLIFIED'),
    minSodraBase:         TAX_2026.IV_MIN_SODRA_BASE * 12,
  };
}
