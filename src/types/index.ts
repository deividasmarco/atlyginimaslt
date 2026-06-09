// ─────────────────────────────────────────────────────────────
// App Types
// ─────────────────────────────────────────────────────────────

export type UserType = 'employee' | 'iv' | 'mb';
export type Language = 'lt' | 'en';
export type EmployerGroup = 1 | 2 | 3 | 4;

export type User = {
  id: string;
  email: string;
  userType: UserType;
  isPremium: boolean;
  premiumExpiry?: Date;
  language: Language;
  createdAt: Date;
};

// ── Journal ───────────────────────────────────────────────────
export type JournalEntryType = 'income' | 'expense';

export type JournalCategory =
  // Income categories
  | 'salary' | 'freelance' | 'rental' | 'dividends' | 'other_income'
  // Expense categories
  | 'office' | 'transport' | 'food' | 'software' | 'equipment'
  | 'phone' | 'training' | 'utilities' | 'housing' | 'entertainment'
  | 'health' | 'other_expense';

export const INCOME_CATEGORIES: JournalCategory[] = [
  'salary', 'freelance', 'rental', 'dividends', 'other_income',
];

export const EXPENSE_CATEGORIES: JournalCategory[] = [
  'office', 'transport', 'food', 'software', 'equipment',
  'phone', 'training', 'utilities', 'housing', 'entertainment',
  'health', 'other_expense',
];

export const CATEGORY_ICONS: Record<JournalCategory, string> = {
  salary: '💼',
  freelance: '💻',
  rental: '🏠',
  dividends: '📈',
  other_income: '💰',
  office: '🏢',
  transport: '🚗',
  food: '🛒',
  software: '📱',
  equipment: '🔧',
  phone: '📞',
  training: '📚',
  utilities: '💡',
  housing: '🏡',
  entertainment: '🎬',
  health: '🏥',
  other_expense: '💸',
};

export type JournalEntry = {
  id: string;
  userId: string;
  type: JournalEntryType;
  amount: number;
  category: JournalCategory;
  description: string;
  date: Date;
  isDeductible: boolean;
  invoiceNumber?: string;
  vatAmount?: number;
  amountWithoutVat?: number;
  clientName?: string;
  supplierName?: string;
  supplierCode?: string;
  vatCode?: string;
  confidence?: number;
  source?: 'manual' | 'scan';
  createdAt: Date;
};

export type MonthSummary = {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  deductibleExpenses: number;
  estimatedGPM: number;
  estimatedSodra: number;
  entryCount: number;
};

// ── Tax calculation results ────────────────────────────────────
export type TaxEstimate = {
  grossIncome: number;
  deductibleExpenses: number;
  taxableProfit: number;
  gpm: number;
  sodraVSD: number;
  sodraPSD: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
};

// ── PDF ───────────────────────────────────────────────────────
export type PDFReportType = 'monthly' | 'quarterly' | 'annual' | 'bank';

export type PDFReportOptions = {
  type: PDFReportType;
  userId: string;
  year: number;
  month?: number;
  quarter?: number;
  includeDeductibles?: boolean;
};

// ── Notifications ─────────────────────────────────────────────
export type NotificationType =
  | 'sodra_reminder'
  | 'declaration_deadline'
  | 'vat_warning'
  | 'year_end'
  | 'general';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduledFor: Date;
  sent: boolean;
};

// ── Subscription ──────────────────────────────────────────────
export type SubscriptionPlan = 'free' | 'monthly' | 'annual' | 'lifetime';

export const SUBSCRIPTION_SKUS = {
  monthly: 'lt.atlyginimas.premium.monthly',
  annual:  'lt.atlyginimas.premium.annual',
} as const;

// ── Calculator options ────────────────────────────────────────
export type EmployeeOptions = {
  isPension: boolean;
  isNPD: boolean;
  employerGroup: EmployerGroup;
};

export type IVOptions = {
  useFlat30: boolean;
  actualExpenses: number;
  annualIncome: number;
};

export type MBOptions = {
  annualRevenue: number;
  annualExpenses: number;
  isNewCompany: boolean;
  isSmallCompany: boolean;
  memberWithdrawal: number;
  directorSalary: number;
  dividends: number;
};
