import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, SubscriptionPlan } from '../types';

export const GUEST_FLAG_KEY    = 'atl_was_guest';
export const PREMIUM_KEY       = 'atl_is_premium';
export const PREMIUM_PLAN_KEY  = 'atl_premium_plan';

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isPremium: boolean;
  subscriptionPlan: SubscriptionPlan;
  hasSkippedAuth: boolean;

  setUser:     (user: User | null) => void;
  setLoading:  (v: boolean)        => void;
  setPremium:  (v: boolean, plan?: SubscriptionPlan) => void;
  loadPremium: () => Promise<void>;
  skipAuth:    () => void;
  logout:      () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user:             null,
  isLoading:        true,
  isPremium:        false,
  subscriptionPlan: 'free',
  hasSkippedAuth:   false,

  setUser:    (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setPremium: (isPremium, plan = 'monthly') => {
    AsyncStorage.setItem(PREMIUM_KEY, isPremium ? '1' : '0').catch(() => {});
    AsyncStorage.setItem(PREMIUM_PLAN_KEY, plan).catch(() => {});
    set({ isPremium, subscriptionPlan: isPremium ? plan : 'free' });
  },
  loadPremium: async () => {
    const stored = await AsyncStorage.getItem(PREMIUM_KEY).catch(() => null);
    if (stored === '1') {
      const plan = (await AsyncStorage.getItem(PREMIUM_PLAN_KEY).catch(() => 'monthly')) ?? 'monthly';
      set({ isPremium: true, subscriptionPlan: plan as SubscriptionPlan });
    }
  },
  skipAuth:   () => {
    AsyncStorage.setItem(GUEST_FLAG_KEY, '1').catch(() => {});
    set({ hasSkippedAuth: true, isLoading: false });
  },
  logout:     () => {
    AsyncStorage.multiRemove([GUEST_FLAG_KEY, PREMIUM_KEY, PREMIUM_PLAN_KEY]).catch(() => {});
    set({ user: null, isPremium: false, subscriptionPlan: 'free', hasSkippedAuth: false });
  },
}));
