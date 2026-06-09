import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserType, Language, EmployerGroup } from '../types';

type SettingsState = {
  // Calculator defaults
  userType: UserType;
  language: Language;
  isPension: boolean;
  isNPD: boolean;
  employerGroup: EmployerGroup;

  // Notifications
  notifDeadlines: boolean;
  notifSodra: boolean;
  notifPVM: boolean;

  // Actions
  setUserType: (t: UserType) => void;
  setLanguage: (l: Language) => void;
  setIsPension: (v: boolean) => void;
  setIsNPD: (v: boolean) => void;
  setEmployerGroup: (g: EmployerGroup) => void;
  setNotif: (key: 'notifDeadlines' | 'notifSodra' | 'notifPVM', v: boolean) => void;
  loadFromStorage: () => Promise<void>;
};

const STORAGE_KEY = 'app_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  userType:        'employee',
  language:        'lt',
  isPension:       false,
  isNPD:           false,
  employerGroup:   1,
  notifDeadlines:  true,
  notifSodra:      true,
  notifPVM:        true,

  setUserType: (userType) => {
    set({ userType });
    saveToStorage(get());
  },
  setLanguage: (language) => {
    set({ language });
    saveToStorage(get());
  },
  setIsPension: (isPension) => {
    set({ isPension });
    saveToStorage(get());
  },
  setIsNPD: (isNPD) => {
    set({ isNPD });
    saveToStorage(get());
  },
  setEmployerGroup: (employerGroup) => {
    set({ employerGroup });
    saveToStorage(get());
  },
  setNotif: (key, value) => {
    set({ [key]: value } as any);
    saveToStorage(get());
  },
  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        set(saved);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },
}));

async function saveToStorage(state: SettingsState) {
  const { loadFromStorage, setUserType, setLanguage, setIsPension,
          setIsNPD, setEmployerGroup, setNotif, ...data } = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
