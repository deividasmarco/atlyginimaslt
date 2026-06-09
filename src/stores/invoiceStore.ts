import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SalesInvoice, InvoiceStatus, InvoiceNumberSettings, InvoiceItem,
  InvoiceFilters, ClientStats,
} from '../types/business';
import { JournalEntry } from '../types';
import { saveToFirestore, deleteFromFirestore } from '../services/firestoreSync';
import { useAuthStore } from './authStore';
import { useJournalStore } from './journalStore';

const INVOICES_KEY = 'sales_invoices';
const SETTINGS_KEY = 'invoice_number_settings';
const FREE_MONTHLY_LIMIT = 5;

const DEFAULT_SETTINGS: InvoiceNumberSettings = {
  prefix: 'SF',
  year: new Date().getFullYear(),
  nextNumber: 1,
};

function generateInvoiceNumber(settings: InvoiceNumberSettings): string {
  return `${settings.prefix}-${settings.year}-${String(settings.nextNumber).padStart(4, '0')}`;
}

function calcTotals(items: InvoiceItem[]) {
  const subtotal  = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const vatAmount = items.reduce((s, i) => s + i.unitPrice * i.quantity * i.vatRate, 0);
  return {
    subtotal:  Math.round(subtotal  * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total:     Math.round((subtotal + vatAmount) * 100) / 100,
  };
}

/**
 * Derives the displayed status. ISSUED invoices past their due date
 * are shown as OVERDUE without mutating stored data.
 */
export function effectiveStatus(inv: SalesInvoice, today = new Date().toISOString().slice(0, 10)): InvoiceStatus {
  if (inv.status === 'ISSUED' && inv.dueDate && inv.dueDate < today) return 'OVERDUE';
  return inv.status;
}

/** Journal income entry id derived from invoice id (stable, so re-pay overwrites). */
function journalIdFor(inv: SalesInvoice): string {
  return `inv_${inv.id}`;
}

type InvoiceState = {
  invoices: SalesInvoice[];
  settings: InvoiceNumberSettings;

  createInvoice: (
    data: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'subtotal' | 'vatAmount' | 'total' | 'createdAt' | 'updatedAt'>
  ) => SalesInvoice;

  markPaid:      (id: string, paymentDate?: string) => void;
  markUnpaid:    (id: string) => void;
  markIssued:    (id: string) => void;
  cancelInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => SalesInvoice | null;
  deleteInvoice: (id: string) => void;

  getInvoice:        (id: string) => SalesInvoice | undefined;
  getClientStats:    (clientId: string) => ClientStats;
  getFiltered:       (f: InvoiceFilters) => SalesInvoice[];
  countThisMonth:    () => number;
  canCreateInvoice:  (isPremium: boolean) => boolean;

  replaceInvoices: (invoices: SalesInvoice[]) => void;
  updateSettings:  (s: Partial<InvoiceNumberSettings>) => void;
  load: () => Promise<void>;
};

function persist(invoices: SalesInvoice[]) {
  AsyncStorage.setItem(INVOICES_KEY, JSON.stringify(invoices)).catch(console.error);
}

function syncOne(inv: SalesInvoice) {
  const uid = useAuthStore.getState().user?.id;
  if (uid) saveToFirestore(uid, 'invoices', inv.id, inv);
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  settings: DEFAULT_SETTINGS,

  createInvoice: (data) => {
    const { settings } = get();
    const now           = new Date().toISOString();
    const invoiceNumber = generateInvoiceNumber(settings);
    const totals        = calcTotals(data.items);

    const invoice: SalesInvoice = {
      ...data,
      ...totals,
      id: Date.now().toString(),
      invoiceNumber,
      createdAt: now,
      updatedAt: now,
    };

    const nextSettings: InvoiceNumberSettings = { ...settings, nextNumber: settings.nextNumber + 1 };
    const next = [invoice, ...get().invoices];

    set({ invoices: next, settings: nextSettings });
    persist(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings)).catch(console.error);
    syncOne(invoice);
    return invoice;
  },

  markPaid: (id, paymentDate) => {
    const inv = get().invoices.find(i => i.id === id);
    if (!inv) return;
    const payDate = paymentDate ?? new Date().toISOString().slice(0, 10);
    const updated: SalesInvoice = {
      ...inv,
      status: 'PAID',
      paymentDate: payDate,
      linkedJournalEntryId: journalIdFor(inv),
      updatedAt: new Date().toISOString(),
    };
    const next = get().invoices.map(i => i.id === id ? updated : i);
    set({ invoices: next });
    persist(next);
    syncOne(updated);

    // Cash-basis income: create a journal income entry on payment
    const entry: JournalEntry = {
      id:            journalIdFor(inv),
      userId:        '',
      type:          'income',
      amount:        inv.total,
      category:      'freelance',
      description:   `Sąskaita ${inv.invoiceNumber}`,
      date:          new Date(payDate),
      isDeductible:  false,
      source:        'manual',
      clientName:    inv.buyerSnapshot?.name,
      invoiceNumber: inv.invoiceNumber,
      vatAmount:     inv.vatAmount || undefined,
      createdAt:     new Date(),
    };
    useJournalStore.getState().upsertEntry(entry);
  },

  markUnpaid: (id) => {
    const inv = get().invoices.find(i => i.id === id);
    if (!inv) return;
    const updated: SalesInvoice = {
      ...inv,
      status: 'ISSUED',
      paymentDate: undefined,
      linkedJournalEntryId: undefined,
      updatedAt: new Date().toISOString(),
    };
    const next = get().invoices.map(i => i.id === id ? updated : i);
    set({ invoices: next });
    persist(next);
    syncOne(updated);

    // Remove the linked journal income entry
    if (inv.linkedJournalEntryId) {
      useJournalStore.getState().deleteEntry(inv.linkedJournalEntryId);
    }
  },

  markIssued: (id) => {
    const inv = get().invoices.find(i => i.id === id);
    if (!inv) return;
    const updated = { ...inv, status: 'ISSUED' as InvoiceStatus, updatedAt: new Date().toISOString() };
    const next = get().invoices.map(i => i.id === id ? updated : i);
    set({ invoices: next });
    persist(next);
    syncOne(updated);
  },

  cancelInvoice: (id) => {
    const inv = get().invoices.find(i => i.id === id);
    if (!inv) return;
    // Remove linked income if it was paid
    if (inv.linkedJournalEntryId) {
      useJournalStore.getState().deleteEntry(inv.linkedJournalEntryId);
    }
    const updated: SalesInvoice = {
      ...inv, status: 'CANCELLED', paymentDate: undefined, linkedJournalEntryId: undefined,
      updatedAt: new Date().toISOString(),
    };
    const next = get().invoices.map(i => i.id === id ? updated : i);
    set({ invoices: next });
    persist(next);
    syncOne(updated);
  },

  duplicateInvoice: (id) => {
    const src = get().invoices.find(i => i.id === id);
    if (!src) return null;
    const { settings } = get();
    const now           = new Date().toISOString();
    const invoiceNumber = generateInvoiceNumber(settings);
    const today         = now.slice(0, 10);

    const copy: SalesInvoice = {
      ...src,
      id: Date.now().toString(),
      invoiceNumber,
      status: 'DRAFT',
      issueDate: today,
      dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      paymentDate: undefined,
      linkedJournalEntryId: undefined,
      pdfUri: undefined,
      // Fresh item ids
      items: src.items.map((it, idx) => ({ ...it, id: `${Date.now()}_${idx}` })),
      createdAt: now,
      updatedAt: now,
    };

    const nextSettings: InvoiceNumberSettings = { ...settings, nextNumber: settings.nextNumber + 1 };
    const next = [copy, ...get().invoices];
    set({ invoices: next, settings: nextSettings });
    persist(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings)).catch(console.error);
    syncOne(copy);
    return copy;
  },

  deleteInvoice: (id) => {
    const inv = get().invoices.find(i => i.id === id);
    if (inv?.linkedJournalEntryId) {
      useJournalStore.getState().deleteEntry(inv.linkedJournalEntryId);
    }
    const next = get().invoices.filter(i => i.id !== id);
    set({ invoices: next });
    persist(next);
    const uid = useAuthStore.getState().user?.id;
    if (uid) deleteFromFirestore(uid, 'invoices', id);
  },

  getInvoice: (id) => get().invoices.find(inv => inv.id === id),

  getClientStats: (clientId) => {
    const list = get().invoices.filter(i => i.clientId === clientId && i.status !== 'CANCELLED');
    const stats: ClientStats = {
      invoiceCount:  list.length,
      totalInvoiced: 0, totalPaid: 0, totalUnpaid: 0, totalOverdue: 0,
    };
    for (const inv of list) {
      stats.totalInvoiced += inv.total;
      const st = effectiveStatus(inv);
      if (st === 'PAID')    stats.totalPaid    += inv.total;
      if (st === 'ISSUED')  stats.totalUnpaid  += inv.total;
      if (st === 'OVERDUE') stats.totalOverdue += inv.total;
    }
    const r = (n: number) => Math.round(n * 100) / 100;
    stats.totalInvoiced = r(stats.totalInvoiced);
    stats.totalPaid     = r(stats.totalPaid);
    stats.totalUnpaid   = r(stats.totalUnpaid);
    stats.totalOverdue  = r(stats.totalOverdue);
    return stats;
  },

  getFiltered: (f) => {
    const today = new Date().toISOString().slice(0, 10);
    return get().invoices.filter(inv => {
      const st = effectiveStatus(inv, today);
      if (f.status !== 'ALL' && st !== f.status) return false;
      if (f.clientId && inv.clientId !== f.clientId) return false;
      if (f.year != null) {
        const d = new Date(inv.issueDate);
        if (d.getFullYear() !== f.year) return false;
        if (f.month != null && d.getMonth() + 1 !== f.month) return false;
      }
      if (f.vat === 'WITH_VAT' && inv.vatAmount <= 0) return false;
      if (f.vat === 'NO_VAT'   && inv.vatAmount > 0)  return false;
      if (f.minAmount != null && inv.total < f.minAmount) return false;
      if (f.maxAmount != null && inv.total > f.maxAmount) return false;
      return true;
    });
  },

  countThisMonth: () => {
    const now = new Date();
    return get().invoices.filter(i => {
      const d = new Date(i.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  },

  canCreateInvoice: (isPremium) => {
    if (isPremium) return true;
    return get().countThisMonth() < FREE_MONTHLY_LIMIT;
  },

  replaceInvoices: (invoices) => { set({ invoices }); persist(invoices); },

  updateSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(console.error);
  },

  load: async () => {
    try {
      const [rawInvoices, rawSettings] = await Promise.all([
        AsyncStorage.getItem(INVOICES_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
      ]);
      const currentYear = new Date().getFullYear();
      let settings = rawSettings ? JSON.parse(rawSettings) as InvoiceNumberSettings : DEFAULT_SETTINGS;
      if (settings.year !== currentYear) {
        settings = { ...settings, year: currentYear, nextNumber: 1 };
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(console.error);
      }
      // Migrate legacy 'SENT' status → 'ISSUED'
      const parsed: SalesInvoice[] = rawInvoices ? JSON.parse(rawInvoices) : [];
      const migrated = parsed.map(i =>
        (i.status as string) === 'SENT' ? { ...i, status: 'ISSUED' as InvoiceStatus } : i
      );
      set({ invoices: migrated, settings });
    } catch { /* ignore */ }
  },
}));

export const FREE_INVOICE_LIMIT = FREE_MONTHLY_LIMIT;
