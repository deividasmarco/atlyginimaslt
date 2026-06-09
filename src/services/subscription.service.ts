import { Platform } from 'react-native';
import { SUBSCRIPTION_SKUS } from '../types';

// Using react-native-iap
// Docs: https://github.com/dooboolab-community/react-native-iap

let iapInitialized = false;

export async function initIAP(): Promise<void> {
  try {
    // const { initConnection } = await import('react-native-iap');
    // await initConnection();
    // iapInitialized = true;
    console.log('IAP would initialize here');
  } catch (error) {
    console.error('IAP init failed:', error);
  }
}

export async function getSubscriptions() {
  try {
    // const { getSubscriptions } = await import('react-native-iap');
    // return await getSubscriptions({ skus: Object.values(SUBSCRIPTION_SKUS) });
    return [
      {
        productId: SUBSCRIPTION_SKUS.monthly,
        localizedPrice: '€3.99',
        title: 'Premium Mėnesinis',
        description: 'Pilna prieiga prie visų funkcijų',
      },
      {
        productId: SUBSCRIPTION_SKUS.annual,
        localizedPrice: '€29.99',
        title: 'Premium Metinis',
        description: 'Sutaupykite 37% — tik €2.50/mėn.',
      },
    ];
  } catch (error) {
    console.error('Get subscriptions failed:', error);
    return [];
  }
}

export async function purchaseSubscription(sku: string): Promise<boolean> {
  try {
    // const { requestSubscription } = await import('react-native-iap');
    // await requestSubscription({ sku });
    return true;
  } catch (error) {
    console.error('Purchase failed:', error);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    // const { getAvailablePurchases } = await import('react-native-iap');
    // const purchases = await getAvailablePurchases();
    // check if any purchase matches our SKUs
    return false;
  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
}
