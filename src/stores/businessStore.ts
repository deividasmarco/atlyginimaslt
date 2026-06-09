import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusinessProfile, BusinessType, ExpenseMode } from '../types/business';
import { saveBusinessProfile } from '../services/firestoreSync';
import { useAuthStore } from './authStore';

const KEY = 'business_profile';

const DEFAULT_PROFILE: BusinessProfile = {
  id: 'default',
  userId: '',
  businessType: 'INDIVIDUALI_VEIKLA',
  vatPayer: false,
  expenseMode: 'FIXED_30_PERCENT',
  pensionAccumulation: false,
  year: new Date().getFullYear(),
};

type BusinessState = {
  profile: BusinessProfile;
  isLoaded: boolean;

  setBusinessType:       (v: BusinessType)    => void;
  setExpenseMode:        (v: ExpenseMode)      => void;
  setPensionAccumulation:(v: boolean)          => void;
  setVatPayer:           (v: boolean)          => void;
  setPersonName:         (v: string)           => void;
  setPersonalCode:       (v: string)           => void;
  setActivityName:       (v: string)           => void;
  setActivityCode:       (v: string)           => void;
  setCompanyName:        (v: string)           => void;
  setCompanyCode:        (v: string)           => void;
  setVatCode:            (v: string)           => void;
  setAddress:            (v: string)           => void;
  setEmail:              (v: string)           => void;
  setPhone:              (v: string)           => void;
  setIban:               (v: string)           => void;
  load:          () => Promise<void>;
  save:          (partial: Partial<BusinessProfile>) => void;
  replaceProfile:(profile: BusinessProfile) => void;
};

export const useBusinessStore = create<BusinessState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  isLoaded: false,

  setBusinessType:        (businessType)        => get().save({ businessType }),
  setExpenseMode:         (expenseMode)         => get().save({ expenseMode }),
  setPensionAccumulation: (pensionAccumulation) => get().save({ pensionAccumulation }),
  setVatPayer:            (vatPayer)            => get().save({ vatPayer }),
  setPersonName:          (personName)          => get().save({ personName }),
  setPersonalCode:        (personalCode)        => get().save({ personalCode }),
  setActivityName:        (activityName)        => get().save({ activityName }),
  setActivityCode:        (activityCode)        => get().save({ activityCode }),
  setCompanyName:         (companyName)         => get().save({ companyName }),
  setCompanyCode:         (companyCode)         => get().save({ companyCode }),
  setVatCode:             (vatCode)             => get().save({ vatCode }),
  setAddress:             (address)             => get().save({ address }),
  setEmail:               (email)               => get().save({ email }),
  setPhone:               (phone)               => get().save({ phone }),
  setIban:                (iban)                => get().save({ iban }),

  save: (partial) => {
    const next = { ...get().profile, ...partial };
    set({ profile: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(console.error);
    const uid = useAuthStore.getState().user?.id;
    if (uid) saveBusinessProfile(uid, next);
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as BusinessProfile;
        set({ profile: { ...DEFAULT_PROFILE, ...saved }, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  replaceProfile: (profile) => {
    set({ profile });
    AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch(console.error);
  },
}));
