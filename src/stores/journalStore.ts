import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, MonthSummary } from '../types';
import { saveToFirestore, deleteFromFirestore } from '../services/firestoreSync';
import { useAuthStore } from './authStore';

const STORAGE_KEY = 'journal_entries';
const FREE_LIMIT  = 20;

function uid(): string | undefined {
  return useAuthStore.getState().user?.id;
}

function saveLocal(entries: JournalEntry[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(console.error);
}

type JournalState = {
  entries:       JournalEntry[];
  isLoading:     boolean;
  selectedYear:  number;
  selectedMonth: number;

  getMonthEntries: (year: number, month: number) => JournalEntry[];
  getMonthSummary: (year: number, month: number) => MonthSummary;
  getYearTotal:    (year: number) => { income: number; expense: number };
  canAddEntry:     (isPremium: boolean) => boolean;

  loadEntries:       () => Promise<void>;
  addEntry:          (entry: Omit<JournalEntry, 'id' | 'createdAt'>, isPremium: boolean) => Promise<boolean>;
  deleteEntry:       (id: string) => Promise<void>;
  setMonth:          (year: number, month: number) => void;
  replaceAllEntries: (entries: JournalEntry[]) => Promise<void>;
  // Adds or replaces an entry by id, bypassing the free monthly limit.
  // Used by the invoice module when an invoice is marked paid.
  upsertEntry:       (entry: JournalEntry) => void;
};

export const useJournalStore = create<JournalState>((set, get) => ({
  entries:       [],
  isLoading:     false,
  selectedYear:  new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,

  getMonthEntries: (year, month) =>
    get().entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }),

  getMonthSummary: (year, month) => {
    const entries = get().getMonthEntries(year, month);
    const totalIncome        = entries.filter(e => e.type === 'income' ).reduce((s, e) => s + e.amount, 0);
    const totalExpense       = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const deductibleExpenses = entries.filter(e => e.isDeductible).reduce((s, e) => s + e.amount, 0);
    return {
      month, year,
      totalIncome:        Math.round(totalIncome  * 100) / 100,
      totalExpense:       Math.round(totalExpense * 100) / 100,
      balance:            Math.round((totalIncome - totalExpense) * 100) / 100,
      deductibleExpenses: Math.round(deductibleExpenses * 100) / 100,
      estimatedGPM:       0,
      estimatedSodra:     0,
      entryCount:         entries.length,
    };
  },

  getYearTotal: (year) => {
    const entries = get().entries.filter(e => new Date(e.date).getFullYear() === year);
    return {
      income:  Math.round(entries.filter(e => e.type === 'income' ).reduce((s, e) => s + e.amount, 0) * 100) / 100,
      expense: Math.round(entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0) * 100) / 100,
    };
  },

  canAddEntry: (isPremium) => {
    if (isPremium) return true;
    const now = new Date();
    return get().getMonthEntries(now.getFullYear(), now.getMonth() + 1).length < FREE_LIMIT;
  },

  loadEntries: async () => {
    set({ isLoading: true });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: JournalEntry[] = JSON.parse(raw).map((e: any) => ({
          ...e,
          date:      new Date(e.date),
          createdAt: new Date(e.createdAt),
        }));
        set({ entries: parsed });
      }
    } catch (e) {
      console.error('Failed to load journal:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addEntry: async (entryData, isPremium) => {
    if (!get().canAddEntry(isPremium)) return false;
    const entry: JournalEntry = {
      ...entryData,
      id:        Date.now().toString(),
      createdAt: new Date(),
    };
    const next = [entry, ...get().entries];
    set({ entries: next });
    saveLocal(next);

    const userId = uid();
    if (userId) {
      saveToFirestore(userId, 'journalEntries', entry.id, {
        ...entry,
        date:      entry.date.toISOString(),
        createdAt: entry.createdAt.toISOString(),
      });
    }
    return true;
  },

  deleteEntry: async (id) => {
    const next = get().entries.filter(e => e.id !== id);
    set({ entries: next });
    saveLocal(next);

    const userId = uid();
    if (userId) deleteFromFirestore(userId, 'journalEntries', id);
  },

  upsertEntry: (entry) => {
    const exists = get().entries.some(e => e.id === entry.id);
    const next = exists
      ? get().entries.map(e => e.id === entry.id ? entry : e)
      : [entry, ...get().entries];
    set({ entries: next });
    saveLocal(next);

    const userId = uid();
    if (userId) {
      saveToFirestore(userId, 'journalEntries', entry.id, {
        ...entry,
        date:      entry.date.toISOString(),
        createdAt: entry.createdAt.toISOString(),
      });
    }
  },

  replaceAllEntries: async (entries) => {
    set({ entries });
    saveLocal(entries);
  },

  setMonth: (year, month) => set({ selectedYear: year, selectedMonth: month }),
}));
