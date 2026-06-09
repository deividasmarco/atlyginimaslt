import { TAX_2026 } from '../constants/tax2026';
import { EmployeeOptions } from '../types';

export type EmployeeResult = {
  gross: number;
  net: number;
  gpm: number;
  psd: number;
  vsd: number;
  sodra: number;
  pension: number;
  npd: number;
  empSodra: number;
  empTotal: number;
  gpmRate: string;
  netPercent: number;
};

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcNPD(gross: number): number {
  const npd = TAX_2026.NPD_BASE - TAX_2026.NPD_PHASE_RATE * (gross - TAX_2026.MMA);
  return Math.max(0, Math.min(TAX_2026.NPD_BASE, npd));
}

function calcGPM(taxableMonthly: number): number {
  const annual = taxableMonthly * 12;
  const { GPM_20_THRESHOLD, GPM_25_THRESHOLD, GPM_RATE_20, GPM_RATE_25, GPM_RATE_32 } = TAX_2026;

  if (annual <= GPM_20_THRESHOLD) {
    return taxableMonthly * GPM_RATE_20;
  } else if (annual <= GPM_25_THRESHOLD) {
    const lo = GPM_20_THRESHOLD / 12;
    return lo * GPM_RATE_20 + (taxableMonthly - lo) * GPM_RATE_25;
  } else {
    const lo  = GPM_20_THRESHOLD / 12;
    const mid = GPM_25_THRESHOLD / 12;
    return lo * GPM_RATE_20 + (mid - lo) * GPM_RATE_25 + (taxableMonthly - mid) * GPM_RATE_32;
  }
}

export function calcEmployee(gross: number, opts: EmployeeOptions): EmployeeResult {
  const pension = opts.isPension ? r2(gross * TAX_2026.PENSION_II) : 0;
  const psd     = r2(gross * TAX_2026.PSD_EMPLOYEE);
  const vsd     = r2(gross * TAX_2026.VSD_EMPLOYEE);
  const sodra   = r2(psd + vsd);
  const npd     = opts.isNPD ? r2(calcNPD(gross)) : 0;

  const taxableMonthly = Math.max(0, gross - sodra - npd - pension);
  const gpm    = r2(calcGPM(taxableMonthly));
  const net    = r2(gross - sodra - gpm - pension);
  const annual = taxableMonthly * 12;

  const empRate  = TAX_2026.EMPLOYER_SODRA_BASE + TAX_2026.EMPLOYER_ACC[opts.employerGroup];
  const empSodra = r2(gross * empRate);
  const empTotal = r2(gross + empSodra);

  const gpmRate = annual <= TAX_2026.GPM_20_THRESHOLD ? '20%'
    : annual <= TAX_2026.GPM_25_THRESHOLD ? '20–25%' : '20–32%';

  return {
    gross: r2(gross), net, gpm, psd, vsd,
    sodra, pension, npd,
    empSodra, empTotal,
    gpmRate,
    netPercent: Math.round((net / gross) * 100),
  };
}

export function netToGross(net: number, opts: EmployeeOptions): EmployeeResult {
  let lo = net, hi = net * 2.5, g = net * 1.35;
  for (let i = 0; i < 80; i++) {
    const res = calcEmployee(g, opts);
    const diff = res.net - net;
    if (Math.abs(diff) < 0.005) break;
    if (diff > 0) hi = g; else lo = g;
    g = (lo + hi) / 2;
  }
  return calcEmployee(g, opts);
}
