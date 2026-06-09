export type BusinessType = 'INDIVIDUALI_VEIKLA' | 'MB' | 'EMPLOYEE';
export type ExpenseMode  = 'FIXED_30_PERCENT'   | 'ACTUAL_EXPENSES';
export type Currency     = 'EUR';

// ── Business profile ──────────────────────────────────────────
export interface BusinessProfile {
  id: string;
  userId: string;
  businessType: BusinessType;
  activityName?: string;
  activityCode?: string;
  personName?: string;
  personalCode?: string;
  companyName?: string;
  companyCode?: string;
  vatPayer: boolean;
  vatCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  iban?: string;
  expenseMode: ExpenseMode;
  pensionAccumulation: boolean;
  year: number;
}

// ── Client ────────────────────────────────────────────────────
export type ClientType = 'COMPANY' | 'PERSON';

export interface Client {
  id: string;
  userId: string;
  type: ClientType;
  name: string;
  companyCode?: string;
  vatCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Aggregated client invoice statistics (computed locally). */
export interface ClientStats {
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  totalUnpaid: number;   // ISSUED (not overdue)
  totalOverdue: number;
}

// ── Invoice ───────────────────────────────────────────────────
// DRAFT = not issued yet · ISSUED = awaiting payment · PAID · OVERDUE (derived) · CANCELLED
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;  // 0 | 0.09 | 0.21
  total: number;   // quantity × unitPrice × (1 + vatRate)
}

/** Frozen copy of party data at invoice creation — never mutated when client/profile changes. */
export interface PartySnapshot {
  name: string;
  companyCode?: string;
  vatCode?: string;
  address?: string;
  email?: string;
  iban?: string;
}

export interface SalesInvoice {
  id: string;
  userId: string;
  businessProfileId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;       // YYYY-MM-DD
  dueDate?: string;
  currency: Currency;
  status: InvoiceStatus;
  buyerSnapshot?: PartySnapshot;   // frozen client data
  sellerSnapshot?: PartySnapshot;  // frozen business-profile data
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  paymentDate?: string;            // set when marked PAID
  linkedJournalEntryId?: string;   // journal income entry created on payment
  notes?: string;
  pdfUri?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Invoice filtering ─────────────────────────────────────────
export type InvoiceFilterStatus = 'ALL' | 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type InvoiceVatFilter    = 'ALL' | 'WITH_VAT' | 'NO_VAT';

export interface InvoiceFilters {
  status:   InvoiceFilterStatus;
  clientId: string | null;
  year:     number | null;
  month:    number | null;       // 1–12 or null for whole year
  vat:      InvoiceVatFilter;
  minAmount: number | null;
  maxAmount: number | null;
}

export interface InvoiceNumberSettings {
  prefix: string;   // e.g. SF
  year: number;
  nextNumber: number;
}

// ── Tax calculation ───────────────────────────────────────────
export type ForecastMode = 'ACTUAL_TO_DATE' | 'PROJECTED_YEAR';

export interface TaxCalculationInput {
  year: number;
  businessType: BusinessType;
  income: number;
  actualExpenses: number;
  expenseMode: ExpenseMode;
  pensionAccumulation: boolean;
  monthsActive: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  deductibleExpenses: number;
  taxableProfit: number;
  sodraBase: number;
  gpm: number;
  psd: number;
  vsd: number;
  totalTaxes: number;
  netAfterTaxes: number;
  warnings: TaxWarning[];
}

export type TaxWarning =
  | 'PSD_MINIMUM_MAY_APPLY'       // sodra base below annual minimum; PSD minimum may apply
  | 'HIGH_INCOME_GPM_SIMPLIFIED'  // taxable profit > 42 500 €; GPM estimate is preliminary
  | 'NEAR_VAT_LIMIT'              // turnover > 80 % of 45 000 €
  | 'EXCEEDED_VAT_LIMIT';         // turnover ≥ 45 000 €

// ── VAT threshold ─────────────────────────────────────────────
export type VatStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';

export interface VatThresholdResult {
  threshold: number;
  currentTurnover: number;
  remaining: number;
  percentageUsed: number;
  status: VatStatus;
}

// ── Annual summary ────────────────────────────────────────────
export interface AnnualTaxSummary {
  year: number;
  income: number;
  actualExpenses: number;
  // Side-by-side comparison of both expense methods
  fixed30: TaxCalculationResult;
  actual: TaxCalculationResult;
  selectedMethod: ExpenseMode;
  betterMethod: ExpenseMode;
  savingsByBetterMethod: number;
  vatThreshold: VatThresholdResult;
}
