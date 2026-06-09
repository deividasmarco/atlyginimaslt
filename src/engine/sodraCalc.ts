import { TAX_2026 } from '../constants/tax2026';

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Quarterly Sodra estimate for IV users
export function calcQuarterlySodra(quarterlyIncome: number): {
  vsd: number;
  psd: number;
  total: number;
  dueDate: string;
} {
  const annualBase = Math.max(
    TAX_2026.IV_MIN_SODRA_BASE * 12,
    quarterlyIncome * 4 * TAX_2026.IV_SODRA_BASE
  );
  const quarterBase = annualBase / 4;
  const vsd   = r2(quarterBase * TAX_2026.IV_VSD);
  const psd   = r2(quarterBase * TAX_2026.IV_PSD);
  const total = r2(vsd + psd);

  const now       = new Date();
  const month     = now.getMonth() + 1;
  const dueDates  = [
    { months: [1, 2, 3],    due: 'Balandžio 1 d.' },
    { months: [4, 5, 6],    due: 'Liepos 1 d.' },
    { months: [7, 8, 9],    due: 'Spalio 1 d.' },
    { months: [10, 11, 12], due: 'Sausio 1 d.' },
  ];
  const dueDate = dueDates.find(d => d.months.includes(month))?.due ?? '';

  return { vsd, psd, total, dueDate };
}

// Annual Sodra estimate for IV users
export function calcAnnualSodra(annualIncome: number): {
  sodraBase: number;
  vsd: number;
  psd: number;
  total: number;
} {
  const sodraBase = Math.max(
    TAX_2026.IV_MIN_SODRA_BASE * 12,
    annualIncome * TAX_2026.IV_SODRA_BASE
  );
  const vsd   = r2(sodraBase * TAX_2026.IV_VSD);
  const psd   = r2(sodraBase * TAX_2026.IV_PSD);
  const total = r2(vsd + psd);
  return { sodraBase: r2(sodraBase), vsd, psd, total };
}

// Check if income is nearing Sodra ceiling (60 VDU)
export function checkSodraCeiling(annualIncome: number): {
  isNearCeiling: boolean;
  isOverCeiling: boolean;
  ceiling: number;
  remaining: number;
} {
  const ceiling   = TAX_2026.GPM_25_THRESHOLD; // 60 VDU = 138,729 €
  const remaining = Math.max(0, ceiling - annualIncome);
  return {
    isNearCeiling: annualIncome >= ceiling * 0.85,
    isOverCeiling: annualIncome >= ceiling,
    ceiling,
    remaining: r2(remaining),
  };
}
