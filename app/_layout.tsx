import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useAuthStore } from '../src/stores/authStore';
import { useBusinessStore } from '../src/stores/businessStore';
import { useClientStore } from '../src/stores/clientStore';
import { useInvoiceStore } from '../src/stores/invoiceStore';
import { useJournalStore } from '../src/stores/journalStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth } from '../src/services/firebase';
import { loadAllFromFirestore } from '../src/services/firestoreSync';
import { clearAllLocalData } from '../src/utils/clearLocalData';
import { GUEST_FLAG_KEY } from '../src/stores/authStore';
import { configurePurchases, checkEntitlement, isPurchasesAvailable } from '../src/services/premium/premiumService';
import i18n from '../src/i18n/index';

export default function RootLayout() {
  const loadSettings    = useSettingsStore(s => s.loadFromStorage);
  const language        = useSettingsStore(s => s.language);
  const { setUser, setLoading, loadPremium, setPremium } = useAuthStore();
  const loadBusiness    = useBusinessStore(s => s.load);
  const replaceProfile  = useBusinessStore(s => s.replaceProfile);
  const loadClients     = useClientStore(s => s.load);
  const replaceClients  = useClientStore(s => s.replaceClients);
  const loadInvoices    = useInvoiceStore(s => s.load);
  const replaceInvoices = useInvoiceStore(s => s.replaceInvoices);
  const { loadEntries, replaceAllEntries } = useJournalStore();

  // On cold start: check AsyncStorage guest flag (persists across kills)
  useEffect(() => {
    loadSettings();
    loadPremium(); // restore premium status across restarts (local cache / Expo Go)

    // Real subscription entitlement (no-op in Expo Go where native module is absent)
    if (isPurchasesAvailable()) {
      configurePurchases()
        .then(() => checkEntitlement())
        .then(active => setPremium(active))
        .catch(() => {});
    }

    AsyncStorage.getItem(GUEST_FLAG_KEY).then(async (flag) => {
      if (flag === '1') {
        // Previous session was guest — clear their data so new sessions are clean
        await clearAllLocalData();
        await AsyncStorage.removeItem(GUEST_FLAG_KEY);
        // Stores are already empty after clear, no need to load
      } else {
        loadBusiness();
        loadClients();
        loadInvoices();
        loadEntries();
      }
    });
  }, []);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  // Firebase auth state listener
  useEffect(() => {
    let unsub: (() => void) | null = null;
    const timeout = setTimeout(() => setLoading(false), 2000);

    try {
      unsub = getFirebaseAuth().onAuthStateChanged(async (firebaseUser: any) => {
        clearTimeout(timeout);

        if (firebaseUser) {
          setUser({
            id:        firebaseUser.uid,
            email:     firebaseUser.email ?? '',
            userType:  'iv',
            isPremium: false,
            language:  'lt',
            createdAt: new Date(),
          });

          // Remove guest flag and clear any leftover guest data, then load from Firestore
          await AsyncStorage.removeItem(GUEST_FLAG_KEY);
          await clearAllLocalData();

          const cloud = await loadAllFromFirestore(firebaseUser.uid);
          const hasCloudData =
            cloud.journalEntries.length > 0 ||
            cloud.clients.length > 0 ||
            cloud.invoices.length > 0;

          if (hasCloudData) {
            // Returning user — restore from cloud
            await replaceAllEntries(cloud.journalEntries);
            replaceClients(cloud.clients);
            replaceInvoices(cloud.invoices);
            if (cloud.profile) replaceProfile(cloud.profile);
          }
          // New user → Firestore is empty, local is already cleared → 0 values ✓
        } else {
          setUser(null);
        }
      });
    } catch {
      clearTimeout(timeout);
      setLoading(false);
    }

    return () => {
      clearTimeout(timeout);
      if (unsub) unsub();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#080C14" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080C14' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/welcome" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="scan"           options={{ presentation: 'modal' }} />
        <Stack.Screen name="invoice/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="invoice/[id]" />
        <Stack.Screen name="client/[id]" />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        <Stack.Screen name="credit-income" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
      </Stack>
    </GestureHandlerRootView>
  );
}
