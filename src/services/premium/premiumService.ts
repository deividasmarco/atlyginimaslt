import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * RevenueCat wrapper.
 *
 * react-native-purchases (+ -ui) are NATIVE modules — not available in Expo Go.
 * Every call is guarded so the app keeps working in Expo Go (purchases simply
 * unavailable) and uses real IAP in dev / production builds.
 */

const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

// ─── RevenueCat keys ──────────────────────────────────────────
// Test Store key — works in dev builds without App Store / Play products.
// For production, replace with platform keys: appl_… (iOS), goog_… (Android).
const RC_TEST_KEY     = 'test_ukeejbWeLCIntdkNnBmleDmgbel';
const RC_IOS_KEY      = '';   // appl_… (set for production)
const RC_ANDROID_KEY  = '';   // goog_… (set for production)

function apiKey(): string | null {
  const platformKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (platformKey) return platformKey;        // real production key (appl_… / goog_…)
  if (__DEV__) return RC_TEST_KEY;            // test key ONLY in dev builds (Metro)
  return null;                                // release build without a real key → don't configure
}

// ⚠️ Must match the entitlement IDENTIFIER in the RevenueCat dashboard exactly.
// If your identifier differs from the display name, change ONLY this line.
const ENTITLEMENT_ID = 'AtlyginimasLT Pro';
// ──────────────────────────────────────────────────────────────

export type PlanType = 'monthly' | 'yearly' | 'lifetime';

let Purchases: any = null;
let PurchasesUI: any = null;
let configured = false;

export function isPurchasesAvailable(): boolean {
  if (IS_EXPO_GO) return false;
  if (Purchases) return true;
  try {
    Purchases = require('react-native-purchases').default;
    return !!Purchases;
  } catch {
    return false;
  }
}

function getUI(): any {
  if (PurchasesUI) return PurchasesUI;
  try {
    PurchasesUI = require('react-native-purchases-ui').default;
  } catch {
    PurchasesUI = null;
  }
  return PurchasesUI;
}

export async function configurePurchases(userId?: string): Promise<void> {
  if (!isPurchasesAvailable() || configured) return;
  const key = apiKey();
  if (!key) {
    // Release build with no production key — skip RevenueCat entirely so the
    // SDK never force-closes the app over a test key. Purchases stay disabled.
    console.warn('[Premium] No production RevenueCat key set — purchases disabled');
    return;
  }
  try {
    Purchases.configure({ apiKey: key, appUserID: userId });
    configured = true;
  } catch (e) {
    console.warn('[Premium] configure failed:', (e as any)?.message);
  }
}

export async function checkEntitlement(): Promise<boolean> {
  if (!isPurchasesAvailable()) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

export interface PremiumOffer {
  monthlyPriceString?: string;
  yearlyPriceString?: string;
  lifetimePriceString?: string;
  hasOfferings: boolean;
}

export async function getPremiumOffer(): Promise<PremiumOffer> {
  if (!isPurchasesAvailable()) return { hasOfferings: false };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) return { hasOfferings: false };
    const find = (type: string) =>
      current.availablePackages.find((p: any) => p.packageType === type)?.product?.priceString;
    return {
      monthlyPriceString:  find('MONTHLY'),
      yearlyPriceString:   find('ANNUAL'),
      lifetimePriceString: find('LIFETIME'),
      hasOfferings: true,
    };
  } catch {
    return { hasOfferings: false };
  }
}

function packageTypeFor(plan: PlanType): string {
  if (plan === 'yearly')   return 'ANNUAL';
  if (plan === 'lifetime') return 'LIFETIME';
  return 'MONTHLY';
}

/** Launches the native purchase sheet. Returns true if entitlement is active afterwards. */
export async function purchasePremium(plan: PlanType): Promise<boolean> {
  if (!isPurchasesAvailable()) throw new Error('PURCHASES_UNAVAILABLE');
  const offerings = await Purchases.getOfferings();
  const current = offerings?.current;
  if (!current) throw new Error('NO_OFFERING');

  const want = packageTypeFor(plan);
  const pkg =
    current.availablePackages.find((p: any) => p.packageType === want) ??
    current.availablePackages[0];
  if (!pkg) throw new Error('NO_PACKAGE');

  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
}

export async function restorePremium(): Promise<boolean> {
  if (!isPurchasesAvailable()) throw new Error('PURCHASES_UNAVAILABLE');
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
}

/**
 * Presents the RevenueCat-hosted Paywall (designed in the dashboard).
 * Returns true if the user ended up with the entitlement.
 * Falls back to false when UI module / paywall is unavailable so the
 * caller can show the custom in-app paywall instead.
 */
export async function presentNativePaywall(): Promise<boolean | null> {
  if (!isPurchasesAvailable()) return null;
  const UI = getUI();
  if (!UI?.presentPaywall) return null;
  try {
    // PAYWALL_RESULT: PURCHASED | RESTORED | CANCELLED | NOT_PRESENTED | ERROR
    const result = await UI.presentPaywall();
    if (result === 'PURCHASED' || result === 'RESTORED') return true;
    if (result === 'NOT_PRESENTED' || result === 'ERROR') return null;
    return false; // cancelled
  } catch {
    return null;
  }
}

/** Opens the RevenueCat Customer Center (manage / cancel / restore). */
export async function presentCustomerCenter(): Promise<void> {
  if (!isPurchasesAvailable()) return;
  const UI = getUI();
  if (!UI?.presentCustomerCenter) return;
  try {
    await UI.presentCustomerCenter();
  } catch { /* ignore */ }
}

export function hasCustomerCenter(): boolean {
  return isPurchasesAvailable() && !!getUI()?.presentCustomerCenter;
}
