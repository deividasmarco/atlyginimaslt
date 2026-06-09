import { TAX_2026 } from '../constants/tax2026';
import { MBOptions } from '../types';

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type MBResult = {
  revenue: number;
  expenses: number;
  profit: number;
  profitTax: number;
  profitTaxRate: number;
  memberWithdrawalGPM: number;
  memberWithdrawalSodra: number;
  directorSalaryGPM: number;
  directorSalarySodra: number;
  dividendGPM: number;
  totalTax: number;
  netToMember: number;
  effectiveRate: number;
};

export function calcMB(opts: MBOptions): MBResult {
  const {
    annualRevenue, annualExpenses, isNewCompany, isSmallCompany,
    memberWithdrawal, directorSalary, dividends,
  } = opts;

  const profit = Math.max(0, annualRevenue - annualExpenses);

  // Profit tax rate selection
  const profitTaxRate = isNewCompany ? TAX_2026.MB_PROFIT_TAX_NEW
    : isSmallCompany  ? TAX_2026.MB_PROFIT_TAX_SMALL
    : TAX_2026.MB_PROFIT_TAX_STANDARD;
  const profitTax = r2(profit * profitTaxRate);

  // Member withdrawal — GPM 20% on full amount, Sodra on 50%
  const withdrawalSodraBase = memberWithdrawal * 0.5;
  const memberWithdrawalGPM   = r2(memberWithdrawal * TAX_2026.MB_MEMBER_WITHDRAWAL_GPM);
  const memberWithdrawalSodra = r2(withdrawalSodraBase * (TAX_2026.MB_MEMBER_VSD + TAX_2026.MB_MEMBER_PSD));

  // Director salary — progressive GPM tiers
  const { tier1, tier2, tier3 } = TAX_2026.MB_DIRECTOR_GPM_RATES;
  let directorSalaryGPM = 0;
  if (directorSalary <= tier1.limit) {
    directorSalaryGPM = directorSalary * tier1.rate;
  } else if (directorSalary <= tier2.limit) {
    directorSalaryGPM = tier1.limit * tier1.rate
      + (directorSalary - tier1.limit) * tier2.rate;
  } else {
    directorSalaryGPM = tier1.limit * tier1.rate
      + (tier2.limit - tier1.limit) * tier2.rate
      + (directorSalary - tier2.limit) * tier3.rate;
  }
  const directorSalarySodra = r2(
    directorSalary * (TAX_2026.PSD_EMPLOYEE + TAX_2026.VSD_EMPLOYEE)
  );

  // Dividends — flat 15% GPM
  const dividendGPM = r2(dividends * TAX_2026.MB_DIVIDEND_GPM);

  const totalTax = r2(
    profitTax + memberWithdrawalGPM + memberWithdrawalSodra
    + r2(directorSalaryGPM) + directorSalarySodra + dividendGPM
  );

  const netToMember = r2(
    (memberWithdrawal - memberWithdrawalGPM - memberWithdrawalSodra)
    + (directorSalary - r2(directorSalaryGPM) - directorSalarySodra)
    + (dividends - dividendGPM)
  );

  const totalIncome = memberWithdrawal + directorSalary + dividends;
  const effectiveRate = totalIncome > 0 ? r2((totalTax / totalIncome) * 100) : 0;

  return {
    revenue: annualRevenue,
    expenses: annualExpenses,
    profit: r2(profit),
    profitTax,
    profitTaxRate,
    memberWithdrawalGPM,
    memberWithdrawalSodra,
    directorSalaryGPM: r2(directorSalaryGPM),
    directorSalarySodra,
    dividendGPM,
    totalTax,
    netToMember,
    effectiveRate,
  };
}
