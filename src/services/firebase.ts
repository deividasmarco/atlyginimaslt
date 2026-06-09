import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the React Native-specific auth build directly.
// The standard firebase/auth wrapper re-exports a node/ESM build that
// never calls registerAuth("ReactNative"), so initializeAuth always fails.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rnAuth = require('firebase/node_modules/@firebase/auth/dist/rn/index.js') as {
  initializeAuth:           (app: any, opts?: any) => any;
  getAuth:                  (app: any) => any;
  getReactNativePersistence:(storage: any) => any;
  signOut:                  (auth: any) => Promise<void>;
};

const firebaseConfig = {
  apiKey:            'AIzaSyCmq2NAGDQLC8xm9KesSQj9oq0ijCcJlmw',
  authDomain:        'atlyginimaslt.firebaseapp.com',
  projectId:         'atlyginimaslt',
  storageBucket:     'atlyginimaslt.firebasestorage.app',
  messagingSenderId: '498656657789',
  appId:             '1:498656657789:web:f397a157f8ced1c99c4c14',
  measurementId:     'G-3SDB2HVQP6',
};

let _app:  any = null;
let _auth: any = null;
let _db:   any = null;

export function getFirebaseApp() {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return _app;
}

export function getFirebaseAuth(): any {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  try {
    _auth = rnAuth.initializeAuth(app, {
      persistence: rnAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (e1: any) {
    console.warn('[Firebase] initializeAuth failed:', e1?.message);
    try {
      _auth = rnAuth.getAuth(app);
    } catch (e2: any) {
      console.error('[Firebase] getAuth failed:', e2?.message);
    }
  }
  return _auth;
}

export function getFirebaseDb(): any {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

// Named re-exports kept for backward compatibility.
// These are FUNCTIONS, not values — react-refresh cannot accidentally
// call them during module registration and trigger early Firebase init.
export const getAuth    = () => getFirebaseAuth();
export const getDb      = () => getFirebaseDb();

// signOut helper so callers don't need to import from firebase/auth
export const signOutUser = () => rnAuth.signOut(getFirebaseAuth());
