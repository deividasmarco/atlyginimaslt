import AsyncStorage from '@react-native-async-storage/async-storage';
import { useJournalStore } from '../stores/journalStore';
import { useClientStore } from '../stores/clientStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useBusinessStore } from '../stores/businessStore';

const KEYS = [
  'journal_entries',
  'clients',
  'sales_invoices',
  'invoice_number_settings',
  'business_profile',
];

/** Wipes all local app data from AsyncStorage and resets every store. */
export async function clearAllLocalData(): Promise<void> {
  await AsyncStorage.multiRemove(KEYS);

  useJournalStore.getState().replaceAllEntries([]);
  useClientStore.getState().replaceClients([]);
  useInvoiceStore.getState().replaceInvoices([]);
  // Reset business profile to defaults (keep language)
  useBusinessStore.setState(s => ({
    ...s,
    profile: { ...s.profile, activityName: undefined, personName: undefined,
      personalCode: undefined, companyName: undefined, companyCode: undefined,
      vatCode: undefined, address: undefined, email: undefined,
      phone: undefined, iban: undefined },
  }));
}
