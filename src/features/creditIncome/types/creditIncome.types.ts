export type CreditIncomeType =
  | 'INDIVIDUAL_ACTIVITY'
  | 'EMPLOYEE_NET'    // employee enters net (take-home) salary directly
  | 'EMPLOYEE_GROSS'  // employee enters gross salary, app calculates net
  | 'MB_MEMBER'
  | 'BUSINESS_CERTIFICATE'
  | 'RENT_OR_INTEREST'
  | 'AGRICULTURE_ACTIVITY'
  | 'PARTNERSHIP_OR_IE_OWNER';

export type PensionAccumulation = 'NONE' | 'PENSION_3' | 'UNKNOWN';
export type ExpenseMode = 'FIXED_30_PERCENT' | 'ACTUAL_EXPENSES';

export interface CreditIncomePeriodInput {
  months: number;
  income: number;
  expenses: number;
}

export interface CreditIncomeInput {
  incomeType: CreditIncomeType;
  expenseMode: ExpenseMode;
  pensionAccumulation: PensionAccumulation;
  psdInsuredElsewhere: boolean;
  previousYear: CreditIncomePeriodInput;
  recentPeriod: CreditIncomePeriodInput;
}

export interface CreditIncomePeriodResult {
  months: number;
  income: number;
  expensesUsed: number;
  taxableProfit: number;
  sodraBase: number;
  gpm: number;
  psd: number;
  vsd: number;
  totalTaxes: number;
  netIncome: number;
  avgMonthlyNet: number;
  warnings: CreditWarning[];
}

export type CreditWarning =
  | 'HIGH_INCOME_GPM_SIMPLIFIED'
  | 'PSD_MINIMUM_APPLIED'
  | 'PSD_INSURED_ELSEWHERE'
  | 'SODRA_CAP_APPLIED';

export interface CreditIncomeResult {
  previousYear: CreditIncomePeriodResult;
  recentPeriod: CreditIncomePeriodResult;
  creditworthyMonthlyIncome: number;
  selectedReason: 'PREVIOUS_YEAR_LOWER' | 'RECENT_PERIOD_LOWER';
  warnings: CreditWarning[];
}

export interface MortgageInput {
  propertyPrice: number;
  downPayment: number;
  loanTermYears: number;
  annualInterestRate: number;
  existingMonthlyLiabilities: number;
  creditworthyMonthlyIncome: number;
}

export type MortgageStatus = 'ENOUGH' | 'CHECK_STRESS' | 'NOT_ENOUGH';

export interface MortgageResult {
  loanAmount: number;
  monthlyPayment: number;
  stressMonthlyPayment: number;
  stressRate: number;
  // #10 — renamed field
  availableByNormal: number;    // income×40% − existingLiabilities
  // #11 — stress available
  availableByStress: number;    // income×50% − existingLiabilities
  maxAllowedMonthlyDebt: number;// income × 40%
  requiredMonthlyIncome: number;
  // #8 — both ratios
  normalRatio: number;          // (existing + payment) / income
  stressRatio: number;          // (existing + stressPayment) / income
  // #4/5/6/7 — three-state status
  status: MortgageStatus;
  eligibleByIncome: boolean;    // kept for backward compat
  // Warnings
  insufficientDownPayment: boolean;
}
