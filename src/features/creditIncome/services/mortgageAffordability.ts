import { MortgageInput, MortgageResult, MortgageStatus } from '../types/creditIncome.types';

function r2(n: number): number { return Math.round(n * 100) / 100; }

const STRESS_RATE          = 5;    // % — Lietuvos Bankas stress scenario
const NORMAL_DTI_LIMIT     = 0.40; // 40% for current rate
const STRESS_DTI_LIMIT     = 0.50; // 50% for stressed rate (conservative threshold)
const MIN_DOWN_PAYMENT_PCT = 0.15; // Lietuvos Bankas minimum 15%

function pmt(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return r2(principal / n);
  return r2(principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

export function calculateMortgageAffordability(input: MortgageInput): MortgageResult {
  const loanAmount          = r2(Math.max(0, input.propertyPrice - input.downPayment));
  const monthlyPayment      = pmt(loanAmount, input.annualInterestRate, input.loanTermYears);
  const stressMonthlyPayment = pmt(loanAmount, STRESS_RATE, input.loanTermYears);

  const income = input.creditworthyMonthlyIncome;
  const exist  = input.existingMonthlyLiabilities;

  // #8 — both debt-to-income ratios
  const normalRatio = income > 0 ? r2((exist + monthlyPayment) / income) : 0;
  const stressRatio = income > 0 ? r2((exist + stressMonthlyPayment) / income) : 0;

  // #4 — three-state status
  const currentPass = normalRatio <= NORMAL_DTI_LIMIT;
  const stressPass  = stressRatio <= STRESS_DTI_LIMIT;

  let status: MortgageStatus;
  if (currentPass && stressPass) {
    status = 'ENOUGH';
  } else if (currentPass && !stressPass) {
    status = 'CHECK_STRESS';
  } else {
    status = 'NOT_ENOUGH';
  }

  // #10 — available for normal 40% rule
  const maxAllowedMonthlyDebt = r2(income * NORMAL_DTI_LIMIT);
  const availableByNormal     = r2(maxAllowedMonthlyDebt - exist);

  // #11 — available under stress 50% rule
  const availableByStress = r2(income * STRESS_DTI_LIMIT - exist);

  // #7 — required income based on actual obligations
  const requiredMonthlyIncome = r2((exist + monthlyPayment) / NORMAL_DTI_LIMIT);

  // #15 — down payment check
  const downPaymentRatio        = input.propertyPrice > 0 ? input.downPayment / input.propertyPrice : 0;
  const insufficientDownPayment = downPaymentRatio < MIN_DOWN_PAYMENT_PCT;

  return {
    loanAmount,
    monthlyPayment,
    stressMonthlyPayment,
    stressRate:            STRESS_RATE,
    availableByNormal,
    availableByStress,
    maxAllowedMonthlyDebt,
    requiredMonthlyIncome,
    normalRatio,
    stressRatio,
    status,
    eligibleByIncome:      status !== 'NOT_ENOUGH',
    insufficientDownPayment,
  };
}
